"""Recovery boundaries without Docker, database access or operational data."""
import copy
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


if __name__ == '__main__':
    unittest.main()
