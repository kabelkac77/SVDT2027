"""Private export acceptance using synthetic files and a fake psql executable."""
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch

from crew_import_verify_test import inputs, uid

sys.path.insert(0, str(Path(__file__).parents[1] / 'tools'))
try:
    import crew_import_export as m
finally:
    sys.path.pop(0)


def document(after=True, keep=True):
    raw, plan, before, target, receipt, source = inputs(keep)
    return {
        'version': 1, 'mode': 'crew_private_export', 'phase': 'after' if after else 'before',
        'editionId': uid(100), 'requestId': receipt['requestId'] if after else None,
        'requestActorId': uid(1) if after else None,
        'databaseName': 'synthetic', 'databaseUser': 'operator', 'actorId': uid(1),
        'transactionReadOnly': True, 'isolationLevel': 'repeatable read',
        'authorityVerified': False, 'applyReady': False, 'cutoverReady': False,
        'target': target if after else before, 'receipt': receipt if after else None,
        'storedSourceText': source if after else None, 'planText': plan if after else None,
    }


def arguments(after=True):
    return dict(edition_id=uid(100), database='synthetic', database_user='operator',
                request_id=uid(701) if after else None, request_actor_id=uid(1) if after else None)


def encode(value):
    return json.dumps(value, ensure_ascii=False).encode('utf-8') + b'\n'


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.addCleanup(patch.stopall)
        patch.object(m, 'ROOT', self.root).start()
        self.payload = self.root / 'payload'
        self.payload.write_bytes(encode(document()))
        self.payload.chmod(0o600)
        self.service = self.root / 'service'
        self.password = self.root / 'password'
        for file in (self.service, self.password):
            file.write_text('PRIVATE-SYNTHETIC-CONFIG')
            file.chmod(0o600)
        self.executable = self.root / 'psql'
        self.fake_body = '''import os,sys
from pathlib import Path
sql=sys.stdin.buffer.read()
assert b'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;' in sql
assert b'COMMIT;' in sql
assert '-X' in sys.argv and '--no-password' in sys.argv
assert 'ON_ERROR_STOP=1' in sys.argv and 'service=synthetic' in sys.argv
for key in ('PGPASSWORD','PGHOST','PGUSER','PGDATABASE','PGOPTIONS','HOME','PSQLRC'):
 assert key not in os.environ
for key in ('PGSERVICEFILE','PGPASSFILE'):
 assert Path(os.environ[key]).read_text()=='PRIVATE-SYNTHETIC-CONFIG'
assert os.environ['PGCLIENTENCODING']=='UTF8'
sys.stdout.buffer.write(Path(PAYLOAD).read_bytes())
'''.replace('PAYLOAD', repr(str(self.payload)))
        self.write_fake(self.fake_body)
        self.options = dict(arguments(), service='synthetic', service_file=str(self.service),
                            pass_file=str(self.password), psql=str(self.executable),
                            output_parent=str(self.root / '.local/exports'))

    def write_fake(self, body):
        self.executable.write_text('#!' + str(Path(sys.executable).resolve()) + '\n' + body)
        self.executable.chmod(0o700)

    def rejected(self, callback):
        with self.assertRaises(ValueError) as caught:
            callback()
        self.assertEqual(str(caught.exception), m.ERROR)
        self.assertIsNone(caught.exception.__cause__)
        self.assertTrue(caught.exception.__suppress_context__)

    def validate(self, data, after=True):
        return m.validate_export(encode(data), **arguments(after))

    def test_before_and_after_envelopes_preserve_exact_values_without_authority(self):
        for after in (False, True):
            data = document(after)
            before = copy.deepcopy(data)
            out = self.validate(data, after)
            self.assertEqual(out, before)
            self.assertEqual(data, before)
            self.assertEqual(out['target']['targetFingerprint'], data['target']['targetFingerprint'])

    def test_export_keeps_source_utf8_newlines_and_exact_server_plan(self):
        data = document()
        source = json.loads(data['storedSourceText'])
        source[-1]['rows'][0][1] = 'ž 😀\\line\n'
        data['storedSourceText'] = json.dumps(source, ensure_ascii=False, indent=2) + '\n'
        source_sha = hashlib.sha256(data['storedSourceText'].encode()).hexdigest()
        plan = json.loads(data['planText'])
        plan['sourceSha256'] = source_sha
        data['planText'] = ' \n' + json.dumps(plan, indent=2) + '\t'
        data['receipt'].update(sourceSha256=source_sha, planSha256=hashlib.sha256(data['planText'].encode()).hexdigest())
        data['target']['sourcePackages'][0]['source_sha256'] = source_sha
        self.assertEqual(self.validate(data), data)

    def test_missing_goals_history_and_metadata_never_become_defaults(self):
        for mutate in (
            lambda d: d.pop('actorId'),
            lambda d: d.update(extra='PRIVATE'),
            lambda d: d['target']['sourceLinks'][0].pop('source_history_id'),
            lambda d: d['target']['categories'][0].pop('required_count'),
            lambda d: d['target']['categories'][0].update(required_count=True),
            lambda d: d['target']['sourceLinks'][0].update(source_history_id=1),
            lambda d: d['target']['sourcePackages'][0].update(source_text='PRIVATE OTHER SOURCE'),
        ):
            data = document()
            mutate(data)
            self.rejected(lambda: self.validate(data))

    def test_scope_and_transaction_mismatch_are_not_published(self):
        for key, value in [('editionId', uid(999)), ('databaseName', 'foreign'),
                           ('databaseUser', 'foreign'), ('actorId', uid(0)),
                           ('transactionReadOnly', False), ('transactionReadOnly', 1),
                           ('isolationLevel', 'read committed'), ('requestId', uid(999)),
                           ('requestActorId', uid(999)), ('version', True),
                           ('applyReady', True), ('authorityVerified', True), ('cutoverReady', 0)]:
            data = document()
            data[key] = value
            self.rejected(lambda: self.validate(data))

    def test_after_requires_actual_matching_receipt_source_plan_and_actor(self):
        for mutate in (
            lambda d: d.update(receipt=None), lambda d: d.update(planText=None),
            lambda d: d.update(storedSourceText=None),
            lambda d: d['receipt'].update(planSha256='d' * 64),
            lambda d: d['receipt'].update(requestId=uid(999)),
            lambda d: d['target']['sourcePackages'][0].update(actor_id=uid(2)),
        ):
            data = document()
            mutate(data)
            self.rejected(lambda: self.validate(data))
        data = document(False)
        data['planText'] = 'private plan'
        self.rejected(lambda: self.validate(data, False))

    def test_archived_target_can_be_collected_without_becoming_activatable(self):
        for after in (False, True):
            data = document(after)
            data['target']['edition']['archived'] = True
            self.assertTrue(self.validate(data, after)['target']['edition']['archived'])

    def test_duplicate_nonfinite_surrogate_deep_and_non_bytes_input_fail_privately(self):
        for raw in (b'{"version":1,"version":1}', b'[NaN]', b'[1e999]',
                    b'"\\ud800"', b'\xff', b'[' * 1500 + b'0' + b']' * 1500,
                    bytearray(encode(document())), 'PRIVATE'):
            self.rejected(lambda: m.validate_export(raw, **arguments()))

    def test_sql_has_no_identity_override_or_write_and_rejects_injection(self):
        sql = m.build_export_sql(**arguments())
        self.assertIn('REPEATABLE READ READ ONLY', sql)
        self.assertIn("to_jsonb(l)", sql)
        self.assertIn("to_jsonb(p)-'source_text'", sql)
        self.assertNotIn('set_config', sql)
        self.assertNotIn('request.jwt', sql)
        self.assertNotIn('SET ROLE', sql)
        for bad in ("x';drop table y;--", '', uid(0), uid(1) + '\n'):
            options = arguments()
            options['edition_id'] = bad
            self.rejected(lambda: m.build_export_sql(**options))
        options = arguments()
        options['database'] = "x';select 1;--"
        self.rejected(lambda: m.build_export_sql(**options))
        options = arguments()
        options['request_actor_id'] = None
        self.rejected(lambda: m.build_export_sql(**options))

    def test_collector_publishes_private_bytes_atomically_and_never_replaces_old_export(self):
        with patch.dict(os.environ, {'PGPASSWORD': 'PRIVATE', 'PGOPTIONS': 'unsafe', 'PSQLRC': 'unsafe'}):
            first = m.collect_export(**self.options)
            second = m.collect_export(**self.options)
        self.assertNotEqual(first['path'], second['path'])
        for result in (first, second):
            file = Path(result['path'])
            self.assertEqual(file.read_bytes(), self.payload.read_bytes())
            self.assertEqual(stat.S_IMODE(file.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(file.parent.stat().st_mode), 0o700)
            self.assertFalse((file.parent / 'export.partial').exists())
            self.assertEqual(result['sha256'], hashlib.sha256(file.read_bytes()).hexdigest())
            self.assertFalse(result['authorityVerified'])
            self.assertFalse(result['applyReady'])

    def test_private_config_checks_happen_before_process_start(self):
        for kind in ('permissions', 'symlink', 'hardlink'):
            with self.subTest(kind=kind):
                if kind == 'permissions':
                    self.service.chmod(0o644)
                elif kind == 'symlink':
                    self.service.unlink()
                    self.service.symlink_to(self.password)
                else:
                    self.service.unlink()
                    os.link(self.password, self.service)
                with patch.object(m.subprocess, 'Popen') as launch:
                    self.rejected(lambda: m.collect_export(**self.options))
                    launch.assert_not_called()

    def test_credentials_are_pinned_to_open_descriptors_not_reopened_paths(self):
        # Replace the pathname, leaving the original inode open for libpq.
        prefix = "from pathlib import Path\np=Path(%r);p.rename(p.with_suffix('.old'));p.write_text('REPLACED')\n" % str(self.service)
        self.write_fake(prefix + self.fake_body)
        self.assertEqual(m.collect_export(**self.options)['status'], 'CREW_PRIVATE_EXPORT_SAVED')

    def test_public_symlink_or_nonprivate_destination_never_starts_collection(self):
        parent = self.root / '.local/exports'
        parent.parent.mkdir(mode=0o700)
        parent.mkdir(mode=0o755)
        with patch.object(m.subprocess, 'Popen') as launch:
            self.rejected(lambda: m.collect_export(**self.options))
            launch.assert_not_called()
        parent.rmdir()
        parent.symlink_to(self.root, target_is_directory=True)
        self.rejected(lambda: m.collect_export(**self.options))
        options = dict(self.options, output_parent=str(self.root / 'public'))
        self.rejected(lambda: m.collect_export(**options))

    def test_nonzero_process_and_malformed_output_keep_only_private_partial(self):
        for body in ("import sys;sys.stderr.write('PRIVATE SERVER ERROR');sys.exit(2)",
                     "import sys;sys.stdout.write('PRIVATE INVALID JSON')"):
            self.write_fake(body)
            self.rejected(lambda: m.collect_export(**self.options))
        for job in (self.root / '.local/exports').iterdir():
            self.assertFalse((job / 'export.json').exists())
            self.assertEqual(stat.S_IMODE(job.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE((job / 'export.partial').stat().st_mode), 0o600)

    def test_size_limit_and_timeout_never_publish_success(self):
        with patch.object(m, 'MAX_EXPORT_BYTES', 100):
            self.rejected(lambda: m.collect_export(**self.options))
        real = m.subprocess.Popen
        processes = []
        def timeout(*args, **kwargs):
            process = real(*args, **kwargs)
            processes.append(process)
            process.communicate = lambda *a, **k: (_ for _ in ()).throw(m.subprocess.TimeoutExpired('safe', 60))
            return process
        self.write_fake('import time;time.sleep(30)')
        with patch.object(m.subprocess, 'Popen', side_effect=timeout):
            self.rejected(lambda: m.collect_export(**self.options))
        self.assertIsNotNone(processes[0].poll())
        self.assertTrue(processes[0].stdin.closed)
        self.assertFalse(any((job / 'export.json').exists() for job in (self.root / '.local/exports').iterdir()))

    def test_directory_replacement_during_collection_is_not_published_elsewhere(self):
        parent = self.root / '.local/exports'
        prefix = "from pathlib import Path\np=Path(%r);p.rename(p.with_name('moved'));p.mkdir(mode=0o700)\n" % str(parent)
        self.write_fake(prefix + self.fake_body)
        self.rejected(lambda: m.collect_export(**self.options))
        self.assertEqual(list(parent.iterdir()), [])
        self.assertFalse(any((job / 'export.json').exists() for job in parent.with_name('moved').iterdir()))

    def test_existing_final_file_and_fsync_failure_are_not_reported_as_success(self):
        link = m.os.link
        def conflict(source, dest, **kwargs):
            fd = os.open(dest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600, dir_fd=kwargs['dst_dir_fd'])
            os.write(fd, b'PREVIOUS PRIVATE ARTIFACT')
            os.close(fd)
            return link(source, dest, **kwargs)
        with patch.object(m.os, 'link', side_effect=conflict):
            self.rejected(lambda: m.collect_export(**self.options))
        job = next((self.root / '.local/exports').iterdir())
        self.assertEqual((job / 'export.json').read_bytes(), b'PREVIOUS PRIVATE ARTIFACT')
        with patch.object(m.os, 'fsync', side_effect=OSError('PRIVATE IO ERROR')):
            self.rejected(lambda: m.collect_export(**self.options))

    def test_late_publication_failure_preserves_complete_private_final_file(self):
        fsync = m.os.fsync
        calls = []
        def late(fd):
            calls.append(fd)
            if len(calls) == 2:
                raise OSError('PRIVATE LATE ERROR')
            return fsync(fd)
        with patch.object(m.os, 'fsync', side_effect=late):
            self.rejected(lambda: m.collect_export(**self.options))
        job = next((self.root / '.local/exports').iterdir())
        self.assertEqual((job / 'export.json').read_bytes(), self.payload.read_bytes())
        self.assertEqual(stat.S_IMODE((job / 'export.json').stat().st_mode), 0o600)

    def test_same_inode_changes_after_validation_do_not_publish_stale_hashes(self):
        validate = m.validate_export
        def mutate(*args, **kwargs):
            result = validate(*args, **kwargs)
            job = next((self.root / '.local/exports').iterdir())
            with (job / 'export.partial').open('r+b') as file:
                file.write(b' ')
                file.flush()
                os.fsync(file.fileno())
            return result
        with patch.object(m, 'validate_export', side_effect=mutate):
            self.rejected(lambda: m.collect_export(**self.options))
        self.assertFalse(any((job / 'export.json').exists() for job in (self.root / '.local/exports').iterdir()))

    def test_cli_requires_explicit_collect_and_never_echoes_invalid_arguments(self):
        complete = [part for key, value in self.options.items() for part in ('--' + key.replace('_', '-'), value)]
        for argv in (['--unexpected=PRIVATEPASSWORD'], complete, ['--col'] + complete):
            output, errors = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors), patch.object(m, 'collect_export') as collect:
                self.assertEqual(m.main(argv), 1)
                collect.assert_not_called()
            self.assertEqual(output.getvalue(), '')
            self.assertEqual(errors.getvalue(), m.ERROR + '\n')


if __name__ == '__main__':
    unittest.main()
