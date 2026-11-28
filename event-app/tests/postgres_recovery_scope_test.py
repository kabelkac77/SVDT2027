"""Recovery boundaries without Docker, database access or operational data."""
import copy
import contextlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location('pg_recovery_scope', Path(__file__).with_name('postgres_test_recovery.py'))
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)
IMAGE = 'postgres@sha256:' + 'd' * 64


class RecoveryScopeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name).resolve()
        self.folder = self.root / 'postgres-synthetic-scope'
        self.folder.mkdir(mode=0o700)
        self.path = self.folder / 'checkpoint.json'
        self.data = dict(version=1, phase='ready', token='a' * 32, name='svdt-synthetic-' + 'a' * 32,
                         containerId='b' * 64, anonymousVolumes=['c' * 64], image=IMAGE)
        self.write(self.data)
        self.args = SimpleNamespace(output_root=str(self.root), docker_socket='/synthetic/local.sock')
        for name in ('password', 'pgpass', 'services'):
            p = self.folder / name
            p.write_text('synthetic only')
            p.chmod(0o600)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, data):
        self.path.write_text(json.dumps(data))
        self.path.chmod(0o600)

    def metadata(self):
        return [self.data['containerId'], '/' + self.data['name'], IMAGE, self.data['token'],
                [{'Type': 'volume', 'Name': 'c' * 64, 'Destination': '/var/lib/postgresql'},
                 {'Type': 'bind', 'Source': str(self.folder / 'password'), 'Destination': '/run/secrets/dbpass', 'RW': False}]]

    def test_owned_private_checkpoint_round_trip_contains_only_evidence(self):
        folder, data, raw = recovery.read_checkpoint(self.path, IMAGE)
        self.assertEqual(folder, self.folder)
        self.assertEqual(data, self.data)
        self.assertEqual(json.loads(raw), self.data)
        recovery.validate_live_identity(data, folder, self.metadata())

    def test_invalid_or_ambiguous_checkpoint_cannot_supply_cleanup_targets(self):
        mutations = [lambda d: d.update(extra='unexpected'), lambda d: d.update(version=True),
                     lambda d: d.update(phase='prepared', containerId=None), lambda d: d.update(image='foreign'),
                     lambda d: d.update(anonymousVolumes=['c' * 64, 'c' * 64]),
                     lambda d: d.update(containerId='not-a-container'), lambda d: d.update(token='foreign')]
        for change in mutations:
            data = copy.deepcopy(self.data)
            change(data)
            self.write(data)
            with self.assertRaises(RuntimeError):
                recovery.read_checkpoint(self.path, IMAGE)
        self.path.write_text(json.dumps(self.data).replace('"version": 1', '"version": 1,"version": 1'))
        with self.assertRaises(RuntimeError):
            recovery.read_checkpoint(self.path, IMAGE)

    def test_symlink_public_permissions_and_oversized_checkpoint_are_denied(self):
        self.path.chmod(0o644)
        with self.assertRaises(RuntimeError):
            recovery.read_checkpoint(self.path, IMAGE)
        self.path.chmod(0o600)
        self.path.write_text(' ' * 16385)
        with self.assertRaises(RuntimeError):
            recovery.read_checkpoint(self.path, IMAGE)
        self.path.unlink()
        self.path.symlink_to(self.folder / 'password')
        with self.assertRaises((OSError, RuntimeError)):
            recovery.read_checkpoint(self.path, IMAGE)
        self.assertEqual((self.folder / 'password').read_text(), 'synthetic only')

    def test_foreign_live_identity_cannot_be_authorized_by_checkpoint(self):
        for index in range(4):
            live = self.metadata()
            live[index] = 'foreign'
            with self.assertRaisesRegex(RuntimeError, 'foreign'):
                recovery.validate_live_identity(self.data, self.folder, live)

    def test_foreign_volume_extra_bind_or_writable_password_mount_are_denied(self):
        changes = [lambda m: m[0].update(Name='e' * 64), lambda m: m[0].update(Destination='/foreign'),
                   lambda m: m[1].update(Source='/foreign/password'), lambda m: m[1].update(RW=True),
                   lambda m: m.append({'Type': 'bind', 'Source': '/foreign'})]
        for change in changes:
            live = self.metadata()
            change(live[4])
            with self.assertRaises(RuntimeError):
                recovery.validate_live_identity(self.data, self.folder, live)

    def fake_type(self, responses):
        class Server:
            docker = Mock(side_effect=responses)
            cleanup = Mock(return_value=True)
            checkpoint = Mock()
            private_write = Mock()
        return Server

    def absent(self, result, kind):
        return result.returncode == 1 and 'no such ' + kind in result.stderr.lower()

    def test_absent_container_never_authorizes_deleting_an_orphan_volume(self):
        server = self.fake_type([SimpleNamespace(returncode=1, stderr='No such object'),
                                 SimpleNamespace(returncode=0, stdout='existing volume')])
        with patch.object(Path, 'is_socket', return_value=True), self.assertRaisesRegex(RuntimeError, 'Orphan'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.cleanup.assert_not_called()
        self.assertTrue((self.folder / 'password').exists())
        self.assertEqual([call.args[0] for call in server.docker.call_args_list], ['inspect', 'volume'])

    def test_unavailable_daemon_is_not_absence_or_permission_to_delete(self):
        server = self.fake_type([SimpleNamespace(returncode=1, stderr='permission denied')])
        with patch.object(Path, 'is_socket', return_value=True), self.assertRaisesRegex(RuntimeError, 'not authorized'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.cleanup.assert_not_called()
        self.assertTrue((self.folder / 'password').exists())

    def test_checkpoint_outside_explicit_root_stops_before_docker(self):
        server = self.fake_type([])
        self.args.output_root = str(self.root / 'foreign')
        with self.assertRaisesRegex(RuntimeError, 'output root'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.docker.assert_not_called()

    def early(self, phase):
        data = dict(self.data, version=2, phase=phase, containerId=None, anonymousVolumes=[])
        self.write(data)
        return data

    def test_v2_early_phase_is_explicit_but_legacy_ambiguity_is_rejected(self):
        for phase in ['prepared', 'creating', 'cleaned']:
            data = self.early(phase)
            self.assertEqual(recovery.read_checkpoint(self.path, IMAGE)[1], data)
            data['version'] = 1
            self.write(data)
            with self.assertRaises(RuntimeError):
                recovery.read_checkpoint(self.path, IMAGE)

    def test_missing_receipt_can_only_take_identity_from_matching_live_metadata(self):
        early = self.early('creating')
        live = self.metadata()
        self.assertEqual(recovery.validate_live_identity(early, self.folder, live), ('b' * 64, ['c' * 64]))
        for index in [1, 2, 3]:
            changed = copy.deepcopy(live)
            changed[index] = 'foreign'
            with self.assertRaises(RuntimeError):
                recovery.validate_live_identity(early, self.folder, changed)

    def test_uncertain_create_absence_preserves_evidence_and_credentials(self):
        self.early('creating')
        before = self.path.read_bytes()
        server = self.fake_type([SimpleNamespace(returncode=1, stderr='No such object')])
        with patch.object(Path, 'is_socket', return_value=True), self.assertRaisesRegex(RuntimeError, 'Uncertain create'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertTrue((self.folder / 'password').exists())
        server.cleanup.assert_not_called()
        server.checkpoint.assert_not_called()

    def test_prepared_absence_can_remove_only_local_unused_credentials(self):
        self.early('prepared')
        server = self.fake_type([SimpleNamespace(returncode=1, stderr='No such object')])
        with patch.object(Path, 'is_socket', return_value=True):
            report = recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        self.assertTrue(report['successful'])
        self.assertTrue(report['alreadyAbsent'])
        self.assertFalse(report['testSuiteSuccessful'])
        self.assertFalse((self.folder / 'password').exists())
        server.cleanup.assert_not_called()
        self.assertEqual(server.docker.call_count, 1)

    def test_partial_ids_cannot_be_mixed_with_early_or_completed_states(self):
        for change in [dict(containerId=None), dict(anonymousVolumes=[]), dict(version=2, phase='creating'),
                       dict(version=2, phase='prepared', containerId=None)]:
            data = dict(self.data, **change)
            self.write(data)
            with self.assertRaises(RuntimeError):
                recovery.read_checkpoint(self.path, IMAGE)

    def test_damaged_bytes_stop_before_docker_and_preserve_evidence(self):
        original = self.path.read_bytes()
        damaged = [b'', b'{', original[:len(original)//2], b'\xff', b'{} trailing', b'{"version":NaN}',
                   b'{"version":Infinity}', b'[' * 1100 + b']' * 1100]
        for raw in damaged:
            with self.subTest(raw=raw[:20]):
                self.path.write_bytes(raw)
                server = self.fake_type([])
                with self.assertRaises(RuntimeError):
                    recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
                self.assertEqual(self.path.read_bytes(), raw)
                self.assertTrue((self.folder / 'password').exists())
                server.docker.assert_not_called()
                server.cleanup.assert_not_called()

    def test_checkpoint_change_after_live_inspection_stops_cleanup(self):
        server = self.fake_type([])
        def inspect(*args, **kwargs):
            changed = dict(self.data, phase='cleaning')
            self.write(changed)
            return SimpleNamespace(returncode=0, stdout='\n'.join(json.dumps(v) for v in self.metadata()))
        server.docker.side_effect = inspect
        with patch.object(Path, 'is_socket', return_value=True), self.assertRaisesRegex(RuntimeError, 'changed during'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.cleanup.assert_not_called()
        self.assertTrue((self.folder / 'password').exists())
        self.assertEqual(json.loads(self.path.read_text())['phase'], 'cleaning')

    def test_failed_recovery_report_keeps_verified_cleanup_distinct_from_success(self):
        server = self.fake_type([SimpleNamespace(returncode=1, stderr='No such object'),
                                 SimpleNamespace(returncode=1, stderr='No such volume')])
        server.private_write.side_effect = OSError('synthetic-sensitive-message')
        with patch.object(Path, 'is_socket', return_value=True):
            report = recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        self.assertFalse(report['successful'])
        self.assertFalse(report['testSuiteSuccessful'])
        self.assertFalse(report['reportPersisted'])
        self.assertTrue(report['containerRemoved'])
        self.assertTrue(report['disposableCredentialsRemoved'])
        self.assertTrue(report['manualReviewRequired'])
        self.assertNotIn('synthetic-sensitive-message', json.dumps(report))
        server.checkpoint.assert_called_once_with('cleaned')

    def test_operation_lock_excludes_second_holder_and_keeps_same_inode(self):
        with recovery.operation_lock(self.folder):
            lock = self.folder / 'operation.lock'
            inode = lock.stat().st_ino
            self.assertEqual(lock.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(recovery.RecoveryBusy):
                with recovery.operation_lock(self.folder):
                    self.fail('Second holder admitted')
        with recovery.operation_lock(self.folder):
            self.assertEqual(lock.stat().st_ino, inode)

    def test_operation_lock_releases_after_exception(self):
        with self.assertRaisesRegex(RuntimeError, 'synthetic interruption'):
            with recovery.operation_lock(self.folder):
                raise RuntimeError('synthetic interruption')
        with recovery.operation_lock(self.folder):
            pass

    def test_symlink_hardlink_and_public_lock_are_refused(self):
        path = self.folder / 'operation.lock'
        foreign = self.folder / 'foreign'
        foreign.write_text('synthetic previous evidence')
        foreign.chmod(0o600)
        for kind in ['symlink', 'hardlink', 'public']:
            if kind == 'symlink':path.symlink_to(foreign)
            elif kind == 'hardlink':os.link(foreign, path)
            else:
                path.write_text('synthetic lock')
                path.chmod(0o644)
            with self.subTest(kind=kind), self.assertRaises((OSError, RuntimeError)):
                with recovery.operation_lock(self.folder):
                    self.fail('Unsafe lock admitted')
            self.assertEqual(foreign.read_text(), 'synthetic previous evidence')
            path.unlink()

    def test_busy_recovery_stops_before_docker_and_preserves_checkpoint(self):
        original = self.path.read_bytes()
        server = self.fake_type([])
        with recovery.operation_lock(self.folder), self.assertRaises(recovery.RecoveryBusy):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.docker.assert_not_called()
        self.assertEqual(self.path.read_bytes(), original)
        self.assertTrue((self.folder / 'password').exists())

    def test_checkpoint_is_read_again_after_lock_acquisition(self):
        @contextlib.contextmanager
        def acquire(folder):
            self.write(dict(self.data, token='d' * 32, name='svdt-synthetic-' + 'd' * 32))
            yield
        server = self.fake_type([SimpleNamespace(returncode=0, stdout='\n'.join(json.dumps(v) for v in self.metadata()))])
        with patch.object(recovery, 'operation_lock', side_effect=acquire), patch.object(Path, 'is_socket', return_value=True), \
             self.assertRaisesRegex(RuntimeError, 'foreign'):
            recovery.recover_checkpoint(self.args, self.path, server, IMAGE, self.absent)
        server.cleanup.assert_not_called()


if __name__ == '__main__':
    unittest.main()
