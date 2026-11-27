"""Opt-in real PostgreSQL tests. Creates only its own disposable synthetic server.

Never accepts an existing database URL, account credential or operational data.
Not collected by the normal unittest/npm suites. See specification46.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import tempfile
import time
import unittest
import uuid

APP = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(APP / 'tests'), str(APP / 'tools')]
from crew_import_preview_test import fixture, encode
from crew_import_plan import build_import_plan

IMAGE = 'postgres@sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5'
OWNER = 'svdt_synthetic_owner'
RUN = None


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def confirmed_absence(result, kind):
    # An unavailable daemon or denied socket is not evidence of removed data.
    return result.returncode == 1 and ('no such ' + kind) in result.stderr.lower()


def uid(n):
    return '00000000-0000-0000-0000-' + str(n).zfill(12)


def literal(value):
    return "'" + value.replace("'", "''") + "'"


class SyntheticServer:
    def __init__(self, args):
        self.args = args
        root = Path(args.output_root).resolve()
        require(root.is_dir() and root.stat().st_uid == os.getuid(), 'Output root must be an owned directory')
        require(root.stat().st_mode & 0o077 == 0, 'Output root must be private')
        require(Path(args.docker_socket).is_socket(), 'A local Unix Docker socket is required')
        self.folder = Path(tempfile.mkdtemp(prefix='postgres-synthetic-', dir=root))
        self.docker_config = self.folder / 'docker-client'
        self.docker_config.mkdir(mode=0o700)
        self.token = uuid.uuid4().hex
        self.container = None
        self.volumes = []
        self.children = []
        self.password_file = self.folder / 'password'
        self.pass_file = self.folder / 'pgpass'
        self.service_file = self.folder / 'services'
        self.password = secrets.token_hex(32)
        self.private_write(self.password_file, self.password)
        self.env = {k: v for k, v in os.environ.items() if k in ('PATH', 'LANG', 'LC_ALL')}
        self.env.update(PGPASSFILE=str(self.pass_file), PGSERVICEFILE=str(self.service_file),
                        PGCONNECT_TIMEOUT='2', PGCLIENTENCODING='UTF8', PGSSLMODE='disable')

    @staticmethod
    def private_write(path, text):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as out:
            out.write(text)

    def docker(self, *args, check=True):
        # Explicit Unix socket; ignore ambient DOCKER_HOST/context and never inspect other containers.
        return subprocess.run([self.args.docker, '--host', 'unix://' + self.args.docker_socket, *args],
                              env={**{k: v for k, v in os.environ.items() if k in ('PATH', 'HOME', 'LANG', 'LC_ALL')},
                                   'DOCKER_CONFIG': str(self.docker_config)},
                              capture_output=True, text=True, timeout=60, check=check)

    def start(self):
        result = self.docker('run', '--detach', '--pull=never', '--name', 'svdt-synthetic-' + self.token,
                             '--label', 'svdt.acceptance.run=' + self.token,
                             '--publish', '127.0.0.1::5432', '--memory', '512m', '--cpus', '1',
                             '--mount', f'type=bind,source={self.password_file},target=/run/secrets/dbpass,readonly',
                             '--env', 'POSTGRES_PASSWORD_FILE=/run/secrets/dbpass',
                             '--env', 'POSTGRES_USER=' + OWNER, '--env', 'POSTGRES_DB=postgres', IMAGE)
        self.container = result.stdout.strip()
        require(re.fullmatch('[0-9a-f]{64}', self.container), 'Invalid owned container identity')
        mounts = json.loads(self.docker('inspect', '--format', '{{json .Mounts}}', self.container).stdout)
        self.volumes = [mount['Name'] for mount in mounts if mount['Type'] == 'volume']
        require(self.volumes and all(re.fullmatch('[0-9a-f]{64}', name) for name in self.volumes), 'Only new anonymous volumes are allowed')
        binding = self.docker('port', self.container, '5432/tcp').stdout.strip()
        require(re.fullmatch(r'127\.0\.0\.1:[0-9]+', binding), 'Only loopback publication is allowed')
        self.port = int(binding.split(':')[1])
        self.private_write(self.pass_file, f'127.0.0.1:{self.port}:*:{OWNER}:{self.password}\n')
        self.private_write(self.service_file, f'[synthetic]\nhost=127.0.0.1\nport={self.port}\nuser={OWNER}\ndbname=postgres\nsslmode=disable\n')
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            if self.sql('postgres', 'select 1', check=False).returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise AssertionError('Disposable PostgreSQL did not become ready')
        self.version = self.scalar('postgres', 'show server_version')
        require(self.version.startswith('18.6'), 'Unexpected pinned server version')
        self.sql('postgres', 'create role anon nologin;create role authenticated nologin;')

    def connection(self, database, application='svdt_acceptance'):
        require(re.fullmatch('[a-z0-9_]+', database), 'Invalid synthetic database name')
        require(re.fullmatch('[a-z0-9_]+', application), 'Invalid synthetic connection label')
        return f'service=synthetic dbname={database} application_name={application}'

    def command(self, database, application='svdt_acceptance'):
        return [str(Path(self.args.pg_bin) / 'psql'), '-X', '-q', '-A', '-t',
                '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose',
                '--dbname', self.connection(database, application)]

    def sql(self, database, sql, check=True):
        result = subprocess.run(self.command(database), input=sql, env=self.env,
                                capture_output=True, text=True, timeout=25)
        if check and result.returncode:
            # Never include service files, passwords or raw server errors in a report.
            states = re.findall(r'ERROR:\s+([0-9A-Z]{5}):', result.stderr)
            raise AssertionError('Synthetic SQL failed: ' + ','.join(states))
        return result

    def scalar(self, database, sql):
        return self.sql(database, sql).stdout.strip()

    def value(self, database, sql):
        return json.loads(self.scalar(database, sql))

    def worker(self, database, application, sql):
        child = subprocess.Popen(self.command(database, application), stdin=subprocess.PIPE,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=self.env)
        child.stdin.write(sql)
        child.stdin.close()
        child.stdin = None
        self.children.append(child)
        return child

    def observed(self, database, application, predicate):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if self.scalar(database, f'select exists(select 1 from pg_stat_activity where application_name={literal(application)} and {predicate})') == 't':
                return True
            time.sleep(0.05)
        return False

    def finish(self, child):
        stdout, stderr = child.communicate(timeout=15)
        return child.returncode, stdout, stderr

    def cleanup(self):
        for child in self.children:
            if child.poll() is None:
                child.kill()
                child.communicate(timeout=5)
        removed = False
        if self.container:
            actual = self.docker('inspect', '--format', '{{index .Config.Labels "svdt.acceptance.run"}}', self.container).stdout.strip()
            require(actual == self.token, 'Refuse cleanup of any other container')
            self.docker('rm', '--force', '--volumes', self.container)
            removed = confirmed_absence(self.docker('inspect', '--format', '{{.Id}}', self.container, check=False), 'object')
            require(removed, 'Owned container cleanup failed')
            for name in self.volumes:
                require(confirmed_absence(self.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'), 'Owned anonymous volume cleanup failed')
        for file in (self.password_file, self.pass_file, self.service_file):
            if file.exists():
                file.unlink()
        self.password = None
        return removed


class PostgresAcceptance(unittest.TestCase):
    def setUp(self):
        self.db = 'synthetic_' + uuid.uuid4().hex
        RUN.sql('postgres', 'create database ' + self.db)
        RUN.sql(self.db, """create schema auth;create table auth.users(id uuid primary key,email text);
create table auth.identities(id uuid primary key,user_id uuid references auth.users,provider text);
create schema storage;create table storage.buckets(id text primary key,public boolean);
create table storage.objects(id uuid primary key,bucket_id text references storage.buckets,name text);
grant usage on schema public,auth to authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;""")
        manifest = json.loads((APP.parent / 'event-app-zadani/shared-deployment-plan.json').read_text())
        for migration in manifest['migrations']:
            path = APP / 'supabase/migrations' / migration['name']
            require(hashlib.sha256(path.read_bytes()).hexdigest() == migration['sha256'], 'Migration hash mismatch')
            RUN.sql(self.db, path.read_text())
        RUN.sql(self.db, f"""insert into auth.users values('{uid(1)}','admin@example.invalid'),('{uid(2)}','finance@example.invalid');
insert into auth.identities values('{uid(901)}','{uid(1)}','synthetic');
insert into storage.buckets values('synthetic',false);
insert into storage.objects values('{uid(902)}','synthetic','synthetic-object-metadata-only');
insert into public.events(id,name) values('{uid(100)}','Synthetic only');
insert into public.editions(id,event_id,year,name) values('{uid(101)}','{uid(100)}',2027,'Synthetic only');
insert into public.edition_members values('{uid(101)}','{uid(1)}','Synthetic admin','admin');
insert into public.crew_members values('{uid(101)}','{uid(2)}','coordinator',true,true,1);""")
        self.source = encode(fixture()).decode()
        target = RUN.value(self.db, self.actor() + f"select public.crew_import_target_preview('{uid(101)}')")
        mapping = {'editionId': uid(101), 'categories': {'cat1': {'id': uid(501), 'action': 'create'}},
                   'entries': {'w1': {'id': uid(601), 'action': 'create', 'compensationAction': 'create', 'kind': 'group'}}}
        report = build_import_plan(self.source.encode(), mapping, target)
        self.plan = report['planText']
        self.assertIsNotNone(self.plan)
        self.approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{uid(101)}',{literal(self.plan)},'{('b' * 64)}')")
        self.request = str(uuid.uuid4())

    def tearDown(self):
        for child in RUN.children:
            if child.poll() is None:
                child.kill()
                child.communicate(timeout=5)

    def actor(self, user=1, client=False):
        return f"set request.jwt.claim.sub={literal(uid(user))};" + ('set role authenticated;' if client else '')

    def apply_sql(self):
        return f"select public.crew_import_apply('{uid(101)}','{self.approval}','{self.request}',{literal(self.plan)},{literal(self.source)});"

    def counts(self):
        return RUN.value(self.db, "select jsonb_build_object('packages',(select count(*) from crew_transfer_packages),'requests',(select count(*) from crew_import_requests),'roster',(select count(*) from crew_roster),'compensation',(select count(*) from crew_compensation),'people',(select count(*) from people),'users',(select count(*) from auth.users))")

    def snapshot(self, database):
        result = {}
        for relation in self.relations():
            result[relation] = RUN.value(database, f"select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from {relation} t")
        return result

    @staticmethod
    def relations():
        sql = (APP / 'supabase/preflight-readonly.sql').read_text()
        return re.findall(r"\('((?:public|auth|storage)\.[a-z_]+)','(?:application|platform)'\)", sql)

    def test_01_same_request_serializes_and_replays_without_duplicates(self):
        a = RUN.worker(self.db, 'svdt_replay_a', 'begin;' + self.actor(client=True) + self.apply_sql() + 'select pg_sleep(4);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_replay_a', "wait_event='PgSleep'"))
        b = RUN.worker(self.db, 'svdt_replay_b', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_replay_b', "wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0"))
        code_a, out_a, _ = RUN.finish(a)
        code_b, out_b, _ = RUN.finish(b)
        self.assertEqual((code_a, code_b), (0, 0))
        self.assertEqual(json.loads(out_a.strip()), json.loads(out_b.strip()))
        self.assertEqual(self.counts(), dict(packages=1, requests=1, roster=1, compensation=1, people=0, users=2))

    def lock_holder(self, name):
        child = RUN.worker(self.db, name, 'begin;lock table public.crew_roster in access exclusive mode;select pg_sleep(4);commit;')
        self.assertTrue(RUN.observed(self.db, name, "wait_event='PgSleep'"))
        return child

    def test_02_lock_timeout_rolls_back_and_exact_request_can_retry(self):
        before = self.snapshot(self.db)
        holder = self.lock_holder('svdt_timeout_holder')
        waiting = RUN.worker(self.db, 'svdt_timeout_client', self.actor(client=True) + "set lock_timeout='800ms';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_timeout_client', "wait_event_type='Lock'"))
        code, _, error = RUN.finish(waiting)
        self.assertNotEqual(code, 0)
        self.assertIn('55P03', error)
        self.assertEqual(RUN.finish(holder)[0], 0)
        self.assertEqual(self.snapshot(self.db), before)
        RUN.sql(self.db, self.actor(client=True) + self.apply_sql())
        self.assertEqual(self.counts()['requests'], 1)

    def test_03_role_removed_while_waiting_is_rechecked_before_writes(self):
        holder = self.lock_holder('svdt_revoke_holder')
        waiting = RUN.worker(self.db, 'svdt_revoke_client', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_revoke_client', "wait_event_type='Lock'"))
        RUN.sql(self.db, f"update public.edition_members set role='viewer' where edition_id='{uid(101)}' and user_id='{uid(1)}'")
        self.assertEqual(RUN.finish(holder)[0], 0)
        code, _, error = RUN.finish(waiting)
        self.assertNotEqual(code, 0)
        self.assertIn('42501', error)
        self.assertEqual(self.counts(), dict(packages=0, requests=0, roster=0, compensation=0, people=0, users=2))

    def test_04_real_collector_dump_restores_rows_history_rls_and_privileges(self):
        RUN.sql(self.db, self.actor(client=True) + self.apply_sql())
        before = self.snapshot(self.db)
        self.assertEqual(len(before), 30)
        self.assertEqual(RUN.value(self.db, 'select to_json(source_text) from crew_transfer_packages'), self.source)
        catalog_sql = """select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('table',relname,'rls',relrowsecurity,'force',relforcerowsecurity) order by relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'),'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname='public'))"""
        catalog = RUN.value(self.db, catalog_sql)
        directory = RUN.folder / 'dump'
        directory.mkdir(mode=0o700)
        config = dict(pgDumpExecutable=str(Path(RUN.args.pg_bin) / 'pg_dump'), pgRestoreExecutable=str(Path(RUN.args.pg_bin) / 'pg_restore'),
                      service='synthetic', serviceFile=str(RUN.service_file), passFile=str(RUN.pass_file), parent=str(directory), requiredRelations=self.relations())
        # The collector accepts only a service alias. Its private file names our own new database.
        service = directory / 'services'
        RUN.private_write(service, RUN.service_file.read_text().replace('dbname=postgres', 'dbname=' + self.db))
        config['serviceFile'] = str(service)
        config_path = directory / 'options.json'
        RUN.private_write(config_path, json.dumps(config))
        bridge = """import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {pathToFileURL} from 'node:url';const {collectPostgres}=await import(pathToFileURL(process.argv[1]));const config=JSON.parse(readFileSync(process.argv[2]));const files=await collectPostgres(config);for(const f of files)writeFileSync(join(config.parent,f.path.split('/').at(-1)),f.bytes,{mode:0o600,flag:'wx'});"""
        subprocess.run([RUN.args.node, '--input-type=module', '-e', bridge, str(APP / 'tools/backup-postgres.js'), str(config_path)],
                       env=RUN.env, capture_output=True, text=True, timeout=40, check=True)
        manifest = json.loads((directory / 'manifest.json').read_text())
        self.assertFalse(manifest['restoreTested'])
        self.assertFalse(manifest['serverRolesIncluded'])
        self.assertFalse(manifest['storageObjectsIncluded'])
        restored = 'restored_' + uuid.uuid4().hex
        RUN.sql('postgres', 'create database ' + restored)
        subprocess.run([str(Path(RUN.args.pg_bin) / 'pg_restore'), '--exit-on-error', '--no-password', '--dbname', RUN.connection(restored), str(directory / 'database.dump')],
                       env=RUN.env, capture_output=True, text=True, timeout=40, check=True)
        self.assertEqual(self.snapshot(restored), before)
        self.assertEqual(RUN.value(restored, catalog_sql), catalog)
        history = RUN.value(restored, self.actor(client=True) + f"select public.crew_transfer_history_row('{uid(101)}','{uid(601)}',(select id from public.crew_transfer_packages limit 1))")
        self.assertEqual(history['historyRow']['year'], '2026')
        self.assertEqual(json.loads(history['sourceRow']['content'])['money']['agreed'], 0)
        self.assertIsNone(json.loads(history['sourceRow']['content'])['money']['paid'])
        denied = RUN.sql(restored, self.actor(2, True) + f"select public.crew_transfer_history_index('{uid(101)}','{uid(601)}')", check=False)
        self.assertNotEqual(denied.returncode, 0)
        self.assertIn('42501', denied.stderr)
        self.assertEqual(RUN.scalar(restored, "select has_function_privilege('anon','public.crew_import_apply(uuid,uuid,uuid,text,text)','execute')"), 'f')
        self.assertEqual(RUN.scalar(restored, "select has_function_privilege('authenticated','public.crew_import_stage_approval(uuid,text,text,timestamptz)','execute')"), 'f')
        service.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-synthetic', action='store_true', required=True)
    parser.add_argument('--docker', required=True)
    parser.add_argument('--docker-socket', required=True)
    parser.add_argument('--pg-bin', required=True)
    parser.add_argument('--node', required=True)
    parser.add_argument('--output-root', required=True)
    args = parser.parse_args()
    global RUN
    RUN = SyntheticServer(args)
    result = None
    removed = False
    try:
        RUN.start()
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PostgresAcceptance))
    finally:
        removed = RUN.cleanup()
    report = {'version': 1, 'mode': 'isolated_synthetic_postgres', 'image': IMAGE,
              'serverVersion': RUN.version, 'casesRun': result.testsRun, 'casesPassed': result.testsRun - len(result.failures) - len(result.errors),
              'successful': result.wasSuccessful(), 'containerRemoved': removed,
              'anonymousVolumesRemoved': removed and bool(RUN.volumes),
              'applicationRuntimeChanged': False, 'realSourceOpened': False, 'liveImportRun': False,
              'liveAuthProviderVerified': False, 'storageBytesRestored': False, 'offsiteBackupActivated': False}
    path = RUN.folder / 'report.json'
    RUN.private_write(path, json.dumps(report, indent=2) + '\n')
    print(json.dumps(report), flush=True)
    return 0 if result.wasSuccessful() and removed else 1


if __name__ == '__main__':
    raise SystemExit(main())
