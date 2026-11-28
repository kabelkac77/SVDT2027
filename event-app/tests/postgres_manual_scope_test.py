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
        with tempfile.TemporaryDirectory() as folder:
            server = object.__new__(manual.SyntheticServer)
            server.folder = Path(folder)
            server.token = 'a' * 32
            server.name = 'svdt-synthetic-' + server.token
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


if __name__ == '__main__':
    unittest.main()
