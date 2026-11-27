"""Safety gates for optional real-PG tests. Never calls Docker or a database."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import sys
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


if __name__ == '__main__':
    unittest.main()
