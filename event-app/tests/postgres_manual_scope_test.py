"""Safety gates for optional real-PG tests. Never calls Docker or a database."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import sys
import json
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

source = Path(__file__).with_name('postgres-acceptance.manual.py')
spec = importlib.util.spec_from_file_location('synthetic_postgres_acceptance', source)
manual = importlib.util.module_from_spec(spec)
saved_path = sys.path[:]
try:
    spec.loader.exec_module(manual)
finally:
    sys.path[:] = saved_path


class PostgresManualScopeTests(unittest.TestCase):
    def arguments(self):
        return ['synthetic-test', '--docker', '/synthetic/docker', '--docker-socket', '/synthetic/docker.sock',
                '--pg-bin', '/synthetic/pg', '--node', '/synthetic/node', '--output-root', '/synthetic/output']

    def test_explicit_opt_in_is_required_before_creating_any_server(self):
        with patch.object(sys, 'argv', self.arguments()), patch.object(manual, 'SyntheticServer') as server, contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                manual.main()
            self.assertEqual(error.exception.code, 2)
            server.assert_not_called()

    def test_existing_database_credentials_and_arbitrary_images_are_not_cli_inputs(self):
        for flag in ['--database-url', '--pg-service-file', '--password', '--image']:
            with self.subTest(flag=flag), patch.object(sys, 'argv', self.arguments() + ['--run-synthetic', flag, 'synthetic-value']), patch.object(manual, 'SyntheticServer') as server, contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    manual.main()
                self.assertEqual(error.exception.code, 2)
                server.assert_not_called()

    def test_connection_fields_cannot_escape_the_generated_local_service(self):
        server = object.__new__(manual.SyntheticServer)
        for value in ['postgresql://elsewhere/db', 'name host=elsewhere', 'name;drop database x', 'name\n', 'name\x00']:
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                server.connection(value)
        for value in ['name host=elsewhere', 'name\n', 'name;select 1']:
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                server.connection('synthetic_123', value)
        self.assertEqual(server.connection('synthetic_123', 'svdt_test'), 'service=synthetic dbname=synthetic_123 application_name=svdt_test')

    def test_docker_uses_explicit_unix_socket_and_private_config_without_ambient_secrets(self):
        server = object.__new__(manual.SyntheticServer)
        server.args = SimpleNamespace(docker='/synthetic/docker', docker_socket='/synthetic/docker.sock')
        server.docker_config = Path('/synthetic/private-config')
        with patch.dict(os.environ, {'DOCKER_HOST': 'tcp://elsewhere:2375', 'DOCKER_CONTEXT': 'foreign', 'PGPASSWORD': 'synthetic-secret', 'ANTHROPIC_API_KEY': 'synthetic-secret'}), patch.object(manual.subprocess, 'run', return_value=SimpleNamespace(returncode=0)) as run:
            server.docker('info')
        args, options = run.call_args
        self.assertEqual(args[0][:3], ['/synthetic/docker', '--host', 'unix:///synthetic/docker.sock'])
        self.assertEqual(options['env']['DOCKER_CONFIG'], '/synthetic/private-config')
        self.assertFalse({'DOCKER_HOST', 'DOCKER_CONTEXT', 'PGPASSWORD', 'ANTHROPIC_API_KEY'} & options['env'].keys())

    def test_cleanup_refuses_a_foreign_container_label(self):
        server = object.__new__(manual.SyntheticServer)
        server.children = []
        server.container = 'a' * 64
        server.token = 'expected-synthetic-run'
        server.checkpoint = Mock()
        server.docker = Mock(return_value=SimpleNamespace(stdout='foreign-run\n'))
        with self.assertRaisesRegex(RuntimeError, 'Refuse cleanup'):
            server.cleanup()
        self.assertEqual(server.docker.call_count, 1)
        self.assertEqual(server.docker.call_args.args[0], 'inspect')

    def test_socket_or_daemon_failures_cannot_be_reported_as_successful_cleanup(self):
        for kind in ['object', 'volume']:
            self.assertTrue(manual.confirmed_absence(SimpleNamespace(returncode=1, stderr='Error: No such ' + kind), kind))
            for code, message in [(0, ''), (1, 'permission denied'), (1, 'cannot connect to daemon'), (2, 'no such ' + kind)]:
                with self.subTest(kind=kind, code=code, message=message):
                    self.assertFalse(manual.confirmed_absence(SimpleNamespace(returncode=code, stderr=message), kind))

    def test_checkpoint_is_private_atomic_and_contains_no_credentials(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = object.__new__(manual.SyntheticServer)
            server.folder = Path(folder)
            server.token = 'a' * 32
            server.name = 'svdt-synthetic-' + server.token
            server.container, server.volumes = None, []
            server.checkpoint('prepared')
            server.container = 'b' * 64
            server.volumes = ['c' * 64]
            server.password = 'synthetic-secret-never-in-checkpoint'
            server.checkpoint('created')
            path = server.folder / 'checkpoint.json'
            old = path.read_bytes()
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            self.assertNotIn(server.password, old.decode())
            self.assertEqual(json.loads(old)['containerId'], server.container)
            with patch.object(manual.os, 'replace', side_effect=OSError('synthetic interrupted replace')):
                with self.assertRaises(OSError):
                    server.checkpoint('ready')
            self.assertEqual(path.read_bytes(), old)
            self.assertEqual(list(server.folder.glob('.checkpoint-*')), [])

    def test_checkpoint_refuses_symlink_without_modifying_foreign_file(self):
        with tempfile.TemporaryDirectory() as folder:
            server = object.__new__(manual.SyntheticServer)
            server.folder = Path(folder)
            foreign = server.folder / 'foreign'
            foreign.write_text('synthetic original')
            (server.folder / 'checkpoint.json').symlink_to(foreign)
            with self.assertRaisesRegex(RuntimeError, 'symlink'):
                server.checkpoint('created')
            self.assertEqual(foreign.read_text(), 'synthetic original')

    def test_signal_is_controlled_interruption_not_an_ordinary_passing_test(self):
        with self.assertRaises(manual.SyntheticInterrupted) as error:
            manual.interrupt_test(manual.signal.SIGTERM, None)
        self.assertEqual(error.exception.signum, manual.signal.SIGTERM)
        self.assertIsInstance(error.exception, KeyboardInterrupt)

    def test_creation_records_resource_identity_with_termination_blocked(self):
        with patch.object(manual.signal, 'pthread_sigmask', side_effect=[{'synthetic_previous'}, None]) as mask:
            with manual.resource_transition():
                self.assertEqual(mask.call_count, 1)
        self.assertEqual(mask.call_args_list[0].args[0], manual.signal.SIG_BLOCK)
        self.assertEqual(mask.call_args_list[1].args, (manual.signal.SIG_SETMASK, {'synthetic_previous'}))

    def test_failed_creating_checkpoint_prevents_any_docker_create(self):
        server = object.__new__(manual.SyntheticServer)
        server.checkpoint = Mock(side_effect=OSError('synthetic checkpoint failure'))
        server.docker = Mock()
        with self.assertRaises(OSError):
            server.create_container()
        server.docker.assert_not_called()

    def startup_main(self, recovery_result=None, recovery_error=None):
        server = SimpleNamespace(folder=Path('/synthetic'), volumes=[], start=Mock(side_effect=RuntimeError('synthetic startup')),
                                 cleanup=Mock(), private_write=Mock())
        server.report_writer = server.private_write
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic', '--probe-startup-failure', 'receipt']), \
             patch.object(manual, 'SyntheticServer', return_value=server), \
             patch.object(manual, 'recover_checkpoint', return_value=recovery_result, side_effect=recovery_error), \
             patch.object(manual.signal, 'signal'), contextlib.redirect_stdout(io.StringIO()) as output:
            code = manual.main()
        return code, json.loads(output.getvalue()), server

    def test_startup_failure_with_unverifiable_cleanup_is_manual_review_not_success(self):
        code, report, server = self.startup_main(recovery_error=RuntimeError('Uncertain create'))
        self.assertEqual(code, 1)
        self.assertFalse(report['successful'])
        self.assertTrue(report['manualReviewRequired'])
        self.assertEqual(report['failureCategory'], 'STARTUP_FAILED')
        self.assertFalse(report['containerRemoved'])
        server.cleanup.assert_not_called()

    def test_cleaned_startup_failure_still_cannot_be_reported_as_passing_suite(self):
        code, report, _ = self.startup_main(recovery_result={'containerRemoved': True, 'anonymousVolumesRemoved': True})
        self.assertEqual(code, 1)
        self.assertFalse(report['successful'])
        self.assertFalse(report['manualReviewRequired'])
        self.assertTrue(report['containerRemoved'])
        self.assertEqual(report['casesRun'], 0)

    def evidence_server(self, folder):
        server = object.__new__(manual.SyntheticServer)
        server.folder, server.token = Path(folder), 'a' * 32
        server.name = 'svdt-synthetic-' + server.token
        server.container, server.volumes, server.children = None, [], []
        server.checkpoint('prepared')
        server.container, server.volumes = 'b' * 64, ['c' * 64]
        server.checkpoint('created')
        server.password_file, server.pass_file, server.service_file = [server.folder / n for n in ('password', 'pgpass', 'services')]
        server.password_file.write_text('synthetic-only')
        server.docker = Mock()
        return server

    def test_corrupt_or_foreign_checkpoint_cannot_be_overwritten_by_cleanup(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = self.evidence_server(folder)
            path = server.folder / 'checkpoint.json'
            foreign = json.loads(path.read_text())
            foreign['token'] = 'd' * 32
            foreign['name'] = 'svdt-synthetic-' + foreign['token']
            for raw in [b'', b'{"version":2,', b'\xff', b'[]', json.dumps(foreign).encode()]:
                with self.subTest(raw=raw):
                    path.write_bytes(raw)
                    with self.assertRaises(RuntimeError):
                        server.cleanup()
                    self.assertEqual(path.read_bytes(), raw)
                    self.assertTrue(server.password_file.exists())
                    server.docker.assert_not_called()

    def test_missing_checkpoint_is_not_recreated_from_memory_during_cleanup(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = self.evidence_server(folder)
            path = server.folder / 'checkpoint.json'
            path.unlink()
            with self.assertRaisesRegex(RuntimeError, 'Missing checkpoint'):
                server.cleanup()
            self.assertFalse(path.exists())
            self.assertTrue(server.password_file.exists())
            server.docker.assert_not_called()

    def test_checkpoint_create_write_and_fsync_errors_preserve_previous_complete_receipt(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = self.evidence_server(folder)
            path = server.folder / 'checkpoint.json'
            old = path.read_bytes()
            for target, attr in [(manual.tempfile, 'mkstemp'), (manual.json, 'dump'), (manual.os, 'fsync')]:
                with self.subTest(operation=attr), patch.object(target, attr, side_effect=OSError('synthetic I/O failure')):
                    with self.assertRaises(OSError):
                        server.cleanup()
                self.assertEqual(path.read_bytes(), old)
                self.assertEqual(list(server.folder.glob('.checkpoint-*')), [])
                self.assertTrue(server.password_file.exists())
                server.docker.assert_not_called()

    def test_private_file_fsync_and_publication_failures_leave_no_partial_target(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'report.json'
            for operation in ['fsync', 'link']:
                with self.subTest(operation=operation), patch.object(manual.os, operation, side_effect=OSError('synthetic publication failure')):
                    with self.assertRaises(OSError):
                        manual.SyntheticServer.private_write(path, 'complete synthetic report')
                self.assertFalse(path.exists())
                self.assertEqual(list(Path(folder).glob('.private-*')), [])
            manual.SyntheticServer.private_write(path, 'complete synthetic report')
            self.assertEqual(path.read_text(), 'complete synthetic report')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_partial_private_write_is_never_published(self):
        opener = os.fdopen
        @contextlib.contextmanager
        def partial(fd, mode):
            with opener(fd, mode) as out:
                def write(value):
                    out.write(value[:3])
                    raise OSError('synthetic short write')
                yield SimpleNamespace(write=write)
        with tempfile.TemporaryDirectory() as folder, patch.object(manual.os, 'fdopen', side_effect=partial):
            path = Path(folder) / 'report.json'
            with self.assertRaises(OSError):
                manual.SyntheticServer.private_write(path, 'complete synthetic report')
            self.assertFalse(path.exists())
            self.assertEqual(list(Path(folder).glob('.private-*')), [])

    def test_report_failure_after_passing_tests_preserves_cleanup_facts_and_fails_command(self):
        server = SimpleNamespace(folder=Path('/synthetic'), volumes=['c' * 64], start=Mock(), cleanup=Mock(return_value=True),
                                 report_writer=Mock(side_effect=OSError('synthetic-sensitive-message')))
        result = SimpleNamespace(testsRun=1, failures=[], errors=[], wasSuccessful=lambda: True)
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic']), \
             patch.object(manual, 'SyntheticServer', return_value=server), patch.object(manual.signal, 'signal'), \
             patch.object(manual.unittest.defaultTestLoader, 'loadTestsFromTestCase'), \
             patch.object(manual.unittest, 'TextTestRunner') as runner, contextlib.redirect_stdout(io.StringIO()) as output:
            runner.return_value.run.return_value = result
            code = manual.main()
        report = json.loads(output.getvalue())
        self.assertEqual(code, 1)
        self.assertFalse(report['successful'])
        self.assertTrue(report['containerRemoved'])
        self.assertTrue(report['anonymousVolumesRemoved'])
        self.assertFalse(report['reportPersisted'])
        self.assertEqual(report['reportFailure'], 'REPORT_WRITE_FAILED')
        self.assertTrue(report['manualReviewRequired'])
        self.assertNotIn('synthetic-sensitive-message', output.getvalue())

    def test_constructor_io_failure_is_safely_reported_before_any_create(self):
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic']), \
             patch.object(manual, 'SyntheticServer', side_effect=OSError('synthetic-sensitive-message')), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            code = manual.main()
        report = json.loads(output.getvalue())
        self.assertEqual(code, 1)
        self.assertEqual(report['failureCategory'], 'PREPARATION_FAILED')
        self.assertFalse(report['containerCreationAttempted'])
        self.assertFalse(report['reportPersisted'])
        self.assertNotIn('synthetic-sensitive-message', output.getvalue())

    def test_existing_report_is_preserved_including_symlink_target(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'report.json'
            foreign = Path(folder) / 'foreign'
            foreign.write_text('synthetic previous evidence')
            for symlink in [False, True]:
                if symlink:
                    path.symlink_to(foreign)
                else:
                    path.write_text('synthetic previous evidence')
                report = {'successful': True, 'containerRemoved': True}
                manual.persist_report(report, path, manual.SyntheticServer.private_write)
                self.assertFalse(report['reportPersisted'])
                self.assertFalse(report['successful'])
                self.assertEqual(path.read_text(), 'synthetic previous evidence')
                self.assertEqual(foreign.read_text(), 'synthetic previous evidence')
                self.assertEqual(list(Path(folder).glob('.private-*')), [])
                path.unlink()

    def test_recovery_cli_cannot_exit_zero_when_its_report_was_not_persisted(self):
        receipt = {'successful': False, 'containerRemoved': True, 'reportPersisted': False}
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic', '--recover-owned-test', '/synthetic/checkpoint.json']), \
             patch.object(manual, 'recover_checkpoint', return_value=receipt), \
             patch.object(manual, 'SyntheticServer') as server, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(manual.main(), 1)
        server.assert_not_called()

    def test_recovery_read_or_write_error_has_safe_failure_receipt(self):
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic', '--recover-owned-test', '/synthetic/checkpoint.json']), \
             patch.object(manual, 'recover_checkpoint', side_effect=OSError('synthetic-sensitive-message')), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(manual.main(), 1)
        report = json.loads(output.getvalue())
        self.assertEqual(report['failureCategory'], 'RECOVERY_FAILED')
        self.assertFalse(report['successful'])
        self.assertFalse(report['containerRemoved'])
        self.assertTrue(report['manualReviewRequired'])
        self.assertNotIn('synthetic-sensitive-message', output.getvalue())

    def test_published_file_is_preserved_when_temporary_unlink_fails(self):
        original_unlink = Path.unlink
        def unlink(path, *args, **kwargs):
            if path.name.startswith('.private-'):
                raise OSError('synthetic temporary cleanup failure')
            return original_unlink(path, *args, **kwargs)
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'report.json'
            with patch.object(Path, 'unlink', unlink), self.assertRaises(manual.PublicationError):
                manual.SyntheticServer.private_write(target, 'complete synthetic evidence')
            self.assertEqual(target.read_text(), 'complete synthetic evidence')
            self.assertEqual(target.stat().st_mode & 0o777, 0o600)
            self.assertEqual(len(list(Path(folder).glob('.private-*'))), 1)

    def test_late_report_error_retains_complete_evidence_but_fails_result(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'report.json'
            def writer(path, text):
                manual.SyntheticServer.private_write(path, text)
                raise manual.PublicationError('synthetic after publication')
            report = {'successful': True, 'containerRemoved': True}
            manual.persist_report(report, target, writer)
            self.assertFalse(report['successful'])
            self.assertTrue(report['reportPersisted'])
            self.assertEqual(report['reportFailure'], 'REPORT_FINALIZATION_FAILED')
            self.assertTrue(report['manualReviewRequired'])
            # The earlier snapshot is preserved; only final stdout + exit proves completion.
            self.assertTrue(json.loads(target.read_text())['successful'])

    def test_constructor_failure_releases_its_operation_lock(self):
        with tempfile.TemporaryDirectory() as folder:
            args = SimpleNamespace(output_root=folder, docker_socket='/synthetic/socket')
            server = object.__new__(manual.SyntheticServer)
            with patch.object(Path, 'is_socket', return_value=True), patch.object(manual.SyntheticServer, 'prepare', side_effect=OSError('synthetic preparation')), \
                 self.assertRaises(OSError):
                server.__init__(args)
            with manual.operation_lock(server.folder):
                pass

    def test_owned_run_releases_lease_on_unhandled_output_error(self):
        lease = SimpleNamespace(__exit__=Mock())
        server = SimpleNamespace(lease=lease)
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic']), patch.object(manual, 'SyntheticServer', return_value=server), \
             patch.object(manual, 'run_owned', side_effect=BrokenPipeError('synthetic output')), self.assertRaises(BrokenPipeError):
            manual.main()
        lease.__exit__.assert_called_once_with(None, None, None)

    def test_post_remove_failure_preserves_cleaning_receipt_and_credentials(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = self.evidence_server(folder)
            server.args = SimpleNamespace(probe_evidence_failure='after-remove')
            server.docker.side_effect = [SimpleNamespace(stdout=server.token), SimpleNamespace(stdout='')]
            with self.assertRaises(OSError):
                server.cleanup()
            self.assertEqual([c.args[0] for c in server.docker.call_args_list], ['inspect', 'rm'])
            self.assertEqual(json.loads((server.folder / 'checkpoint.json').read_text())['phase'], 'cleaning')
            self.assertTrue(server.password_file.exists())

    def test_checkpoint_publication_is_not_undone_after_late_error(self):
        with tempfile.TemporaryDirectory(prefix='postgres-synthetic-') as folder:
            server = self.evidence_server(folder)
            server.args = SimpleNamespace(probe_evidence_failure='after-checkpoint')
            with self.assertRaises(manual.PublicationError):
                server.checkpoint('cleaned')
            self.assertEqual(manual.read_checkpoint(server.folder / 'checkpoint.json', manual.IMAGE)[1]['phase'], 'cleaned')
            self.assertEqual(list(server.folder.glob('.checkpoint-*')), [])

    def test_recovery_busy_is_safe_nonzero_without_requesting_manual_approval(self):
        with patch.object(sys, 'argv', self.arguments()+['--run-synthetic', '--recover-owned-test', '/synthetic/checkpoint.json']), \
             patch.object(manual, 'recover_checkpoint', side_effect=manual.RecoveryBusy('synthetic busy')), \
             contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(manual.main(), 1)
        report = json.loads(output.getvalue())
        self.assertEqual(report['failureCategory'], 'RECOVERY_BUSY')
        self.assertFalse(report['manualReviewRequired'])
        self.assertFalse(report['containerRemoved'])

    def test_metadata_inventory_cli_needs_no_docker_or_database_tools(self):
        with tempfile.TemporaryDirectory() as folder:
            argv = ['synthetic-test', '--run-synthetic', '--output-root', folder, '--inventory-residues']
            with patch.object(sys, 'argv', argv), patch.object(manual, 'SyntheticServer') as server, \
                 patch.object(manual.subprocess, 'run') as run, contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(manual.main(), 0)
            report = json.loads(output.getvalue())
            self.assertTrue(report['complete'])
            self.assertFalse(report['contentRead'])
            self.assertFalse(report['filesDeleted'])
            self.assertFalse(report['dockerContacted'])
            server.assert_not_called()
            run.assert_not_called()

    def test_inventory_cli_failure_is_safe_and_does_not_read_input_file(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'synthetic-root-file'
            file.write_text('SYNTHETIC-CONTENT-MUST-NOT-APPEAR')
            argv = ['synthetic-test', '--run-synthetic', '--output-root', str(file), '--inventory-residues']
            with patch.object(sys, 'argv', argv), patch.object(manual, 'SyntheticServer') as server, \
                 contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(manual.main(), 1)
            report = json.loads(output.getvalue())
            self.assertFalse(report['complete'])
            self.assertEqual(report['failureCategory'], 'INVENTORY_FAILED')
            self.assertNotIn('SYNTHETIC-CONTENT-MUST-NOT-APPEAR', output.getvalue())
            self.assertTrue(file.exists())
            server.assert_not_called()

    def test_noninventory_tools_and_recovery_stage_are_validated_before_work(self):
        cases = [['synthetic-test', '--run-synthetic', '--output-root', '/synthetic/output'],
                 self.arguments()+['--run-synthetic', '--probe-recovery-interruption', 'invalid', '/synthetic/checkpoint.json']]
        for argv in cases:
            with patch.object(sys, 'argv', argv), patch.object(manual, 'SyntheticServer') as server, \
                 patch.object(manual, 'recover_checkpoint') as recover, contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
                manual.main()
            self.assertEqual(error.exception.code, 2)
            server.assert_not_called()
            recover.assert_not_called()

    def test_write_probe_is_opt_in_and_has_bounded_pause(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'report.json'
            with patch.object(manual, 'WRITE_PROBE', None), patch.object(manual.time, 'sleep') as sleep:
                manual.write_probe_pause('report-partial', target)
            sleep.assert_not_called()
            self.assertEqual(list(Path(folder).iterdir()), [])
            probe = {'stage': 'report-partial', 'baselineSha256': 'a' * 64}
            with patch.object(manual, 'WRITE_PROBE', probe), patch.object(manual.time, 'sleep') as sleep, self.assertRaises(RuntimeError):
                manual.write_probe_pause('report-partial', target)
            sleep.assert_called_once_with(15)
            self.assertFalse(target.exists())
            metadata = json.loads((Path(folder) / 'write-paused-report-partial.json').read_text())
            self.assertEqual(metadata, probe)

    def test_partial_write_cli_has_no_docker_tool_requirement(self):
        argv = ['synthetic-test', '--run-synthetic', '--output-root', '/synthetic/output', '--verify-partial-writes']
        with patch.object(sys, 'argv', argv), patch.object(manual, 'verify_partial_writes', return_value=0) as verify, \
             patch.object(manual, 'SyntheticServer') as server:
            self.assertEqual(manual.main(), 0)
        verify.assert_called_once()
        server.assert_not_called()


if __name__ == '__main__':
    unittest.main()
