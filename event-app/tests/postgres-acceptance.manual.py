"""Opt-in real PostgreSQL tests. Creates only its own disposable synthetic server.

Never accepts an existing database URL, account credential or operational data.
Not collected by the normal unittest/npm suites. See specification46.
"""
import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import signal
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
from postgres_test_recovery import recover_checkpoint, read_checkpoint, persist_report, operation_lock, RecoveryBusy, PublicationError, recovery_pause, RECOVERY_STAGES, inventory_residues

IMAGE = 'postgres@sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5'
OWNER = 'svdt_synthetic_owner'
RUN = None
WRITE_PROBE = None
WRITE_STAGES = ('checkpoint-partial', 'checkpoint-before-publish', 'report-partial', 'report-before-publish')


def write_probe_pause(stage, target):
    if WRITE_PROBE is not None and WRITE_PROBE['stage'] == stage:
        marker = target.parent / ('write-paused-' + stage + '.json')
        payload = json.dumps({'stage': stage, 'baselineSha256': WRITE_PROBE['baselineSha256']}).encode()
        fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as out:
            out.write(payload)
            out.flush()
            os.fsync(out.fileno())
        time.sleep(15)
        raise RuntimeError('Partial-write probe was not interrupted')


class SyntheticInterrupted(KeyboardInterrupt):
    def __init__(self, signum):
        self.signum = signum


def interrupt_test(signum, frame):
    raise SyntheticInterrupted(signum)


@contextlib.contextmanager
def resource_transition():
    # Do not lose the container identity/checkpoint between create and receipt.
    previous = signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGINT, signal.SIGTERM})
    try:
        yield
    finally:
        signal.pthread_sigmask(signal.SIG_SETMASK, previous)


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
        self.lease = operation_lock(self.folder)
        self.lease.__enter__()
        try:
            self.prepare(args)
        except BaseException:
            self.lease.__exit__(*sys.exc_info())
            raise

    def prepare(self, args):
        self.docker_config = self.folder / 'docker-client'
        self.docker_config.mkdir(mode=0o700)
        self.token = uuid.uuid4().hex
        self.name = 'svdt-synthetic-' + self.token
        self.container = None
        self.volumes = []
        self.children = []
        self.password_file = self.folder / 'password'
        self.pass_file = self.folder / 'pgpass'
        self.service_file = self.folder / 'services'
        self.password = secrets.token_hex(32)
        self.checkpoint('prepared')
        self.private_write(self.password_file, self.password)
        self.env = {k: v for k, v in os.environ.items() if k in ('PATH', 'LANG', 'LC_ALL')}
        self.env.update(PGPASSFILE=str(self.pass_file), PGSERVICEFILE=str(self.service_file),
                        PGCONNECT_TIMEOUT='2', PGCLIENTENCODING='UTF8', PGSSLMODE='disable')

    @staticmethod
    def private_write(path, text):
        # Publish a complete private file without replacing existing evidence.
        fd, name = tempfile.mkstemp(prefix='.private-', dir=path.parent)
        temporary = Path(name)
        published = False
        try:
            with os.fdopen(fd, 'w') as out:
                if path.name == 'report.json' and WRITE_PROBE is not None and WRITE_PROBE['stage'] == 'report-partial':
                    out.write(text[:max(1, len(text) // 2)])
                    out.flush()
                    write_probe_pause('report-partial', path)
                out.write(text)
                out.flush()
                os.fsync(out.fileno())
            if path.name == 'report.json':
                write_probe_pause('report-before-publish', path)
            os.link(temporary, path)
            published = True
        finally:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                if published:
                    raise PublicationError('Private file published; temporary cleanup failed') from None
                raise

    def report_writer(self, path, text):
        if getattr(self.args, 'probe_evidence_failure', None) == 'report':
            raise OSError('Controlled synthetic report publication failure')
        self.private_write(path, text)
        if getattr(self.args, 'probe_evidence_failure', None) == 'after-report':
            raise PublicationError('Controlled failure after complete report publication')

    def checkpoint(self, phase):
        """Private data-only receipt, never an input that authorizes deletion."""
        target = self.folder / 'checkpoint.json'
        require(not target.is_symlink(), 'Checkpoint cannot be a symlink')
        if target.exists():
            _, previous, _ = read_checkpoint(target, IMAGE)
            require(previous['token'] == self.token and previous['name'] == self.name
                    and (previous['containerId'] is None or (previous['containerId'] == self.container
                         and previous['anonymousVolumes'] == self.volumes)), 'Checkpoint does not match owned server')
        else:
            require(phase == 'prepared', 'Missing checkpoint needs manual review')
        payload = {'version': 2, 'phase': phase, 'token': self.token,
                   'name': self.name, 'containerId': self.container,
                   'anonymousVolumes': self.volumes, 'image': IMAGE}
        fd, name = tempfile.mkstemp(prefix='.checkpoint-', dir=self.folder)
        temporary = Path(name)
        try:
            with os.fdopen(fd, 'w') as out:
                if WRITE_PROBE is not None and WRITE_PROBE['stage'] == 'checkpoint-partial':
                    out.write('{"version":')
                    out.flush()
                    write_probe_pause('checkpoint-partial', target)
                json.dump(payload, out, sort_keys=True)
                out.write('\n')
                out.flush()
                os.fsync(out.fileno())
            write_probe_pause('checkpoint-before-publish', target)
            if getattr(getattr(self, 'args', None), 'probe_evidence_failure', None) == 'checkpoint-' + phase:
                raise OSError('Controlled synthetic checkpoint publication failure')
            os.replace(temporary, target)
            if getattr(getattr(self, 'args', None), 'probe_evidence_failure', None) == 'after-checkpoint' and phase == 'cleaned':
                raise PublicationError('Controlled failure after complete checkpoint publication')
        finally:
            temporary.unlink(missing_ok=True)

    def docker(self, *args, check=True):
        # Explicit Unix socket; ignore ambient DOCKER_HOST/context and never inspect other containers.
        return subprocess.run([self.args.docker, '--host', 'unix://' + self.args.docker_socket, *args],
                              env={**{k: v for k, v in os.environ.items() if k in ('PATH', 'HOME', 'LANG', 'LC_ALL')},
                                   'DOCKER_CONFIG': str(self.docker_config)},
                              capture_output=True, text=True, timeout=60, check=check)

    def start(self):
        self.startup_fault('prepared')
        with resource_transition():
            self.create_container()
        self.startup_fault('start')
        self.docker('start', self.container)
        binding = self.docker('port', self.container, '5432/tcp').stdout.strip()
        require(re.fullmatch(r'127\.0\.0\.1:[0-9]+', binding), 'Only loopback publication is allowed')
        self.port = int(binding.split(':')[1])
        self.private_write(self.pass_file, f'127.0.0.1:{self.port}:*:{OWNER}:{self.password}\n')
        self.private_write(self.service_file, f'[synthetic]\nhost=127.0.0.1\nport={self.port}\nuser={OWNER}\ndbname=postgres\nsslmode=disable\n')
        self.startup_fault('readiness')
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
        self.checkpoint('ready')

    def create_container(self):
        self.checkpoint('creating')
        result = self.docker('create', '--pull=never', '--name', self.name,
                             '--label', 'svdt.acceptance.run=' + self.token,
                             '--publish', '127.0.0.1::5432', '--memory', '512m', '--cpus', '1',
                             '--mount', f'type=bind,source={self.password_file},target=/run/secrets/dbpass,readonly',
                             '--env', 'POSTGRES_PASSWORD_FILE=/run/secrets/dbpass',
                             '--env', 'POSTGRES_USER=' + OWNER, '--env', 'POSTGRES_DB=postgres', IMAGE)
        self.startup_fault('receipt')
        self.container = result.stdout.strip()
        require(re.fullmatch('[0-9a-f]{64}', self.container), 'Invalid owned container identity')
        mounts = json.loads(self.docker('inspect', '--format', '{{json .Mounts}}', self.container).stdout)
        self.volumes = [mount['Name'] for mount in mounts if mount['Type'] == 'volume']
        require(self.volumes and all(re.fullmatch('[0-9a-f]{64}', name) for name in self.volumes), 'Only new anonymous volumes are allowed')
        self.checkpoint('created')

    def startup_fault(self, stage):
        if getattr(self.args, 'probe_startup_failure', None) == stage:
            raise RuntimeError('Controlled synthetic startup failure')

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
        self.checkpoint('cleaning')
        removed = False
        if self.container:
            actual = self.docker('inspect', '--format', '{{index .Config.Labels "svdt.acceptance.run"}}', self.container).stdout.strip()
            require(actual == self.token, 'Refuse cleanup of any other container')
            self.docker('rm', '--force', '--volumes', self.container)
            recovery_pause(self, 'removed')
            if getattr(getattr(self, 'args', None), 'probe_evidence_failure', None) == 'after-remove':
                raise OSError('Controlled failure after owned container removal')
            removed = confirmed_absence(self.docker('inspect', '--format', '{{.Id}}', self.container, check=False), 'object')
            require(removed, 'Owned container cleanup failed')
            for name in self.volumes:
                require(confirmed_absence(self.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'), 'Owned anonymous volume cleanup failed')
        for file in (self.password_file, self.pass_file, self.service_file):
            if file.exists():
                file.unlink()
        self.password = None
        recovery_pause(self, 'credentials')
        self.checkpoint('cleaned')
        recovery_pause(self, 'checkpoint')
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
            upgrade = migration['name'] == '202611280001_crew_import_expiry_guard.sql'
            metadata_sql = """select jsonb_build_object('oid',p.oid::text,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl)
from pg_proc p where p.oid='public.crew_import_apply(uuid,uuid,uuid,text,text)'::regprocedure"""
            if upgrade:
                before_upgrade = RUN.value(self.db, metadata_sql)
            RUN.sql(self.db, path.read_text())
            if upgrade:
                self.assertEqual(RUN.value(self.db, metadata_sql), before_upgrade)
                RUN.expiry_guard_identity_preserved = True
        RUN.expiry_guard_applied = any(m['name'] == '202611280001_crew_import_expiry_guard.sql' for m in manifest['migrations'])
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

    def apply_sql(self, request=None):
        return f"select public.crew_import_apply('{uid(101)}','{self.approval}','{request or self.request}',{literal(self.plan)},{literal(self.source)});"

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
        function_sql = """select jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'config',p.proconfig)
from pg_proc p where p.oid='public.crew_import_apply(uuid,uuid,uuid,text,text)'::regprocedure"""
        function = RUN.value(self.db, function_sql)
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
        self.assertEqual(RUN.value(restored, function_sql), function)
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

    def test_05_approval_revoked_while_waiting_denies_the_write(self):
        holder = RUN.worker(self.db, 'svdt_approval_holder', 'begin;' + self.actor() +
                            f"select id from public.editions where id='{uid(101)}' for update;select pg_sleep(4);select public.crew_import_revoke('{uid(101)}','{self.approval}');commit;")
        self.assertTrue(RUN.observed(self.db, 'svdt_approval_holder', "wait_event='PgSleep'"))
        waiting = RUN.worker(self.db, 'svdt_approval_client', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_approval_client', "wait_event_type='Lock'"))
        self.assertEqual(RUN.finish(holder)[0], 0)
        code, _, error = RUN.finish(waiting)
        self.assertNotEqual(code, 0)
        self.assertIn('42501', error)
        self.assertEqual(self.counts(), dict(packages=0, requests=0, roster=0, compensation=0, people=0, users=2))

    def test_06_approval_expired_while_waiting_denies_the_write(self):
        self.approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{uid(101)}',{literal(self.plan)},'{('b' * 64)}',clock_timestamp()+interval '2 seconds')")
        holder = RUN.worker(self.db, 'svdt_expiry_holder', f"begin;select id from public.editions where id='{uid(101)}' for update;select pg_sleep(4);commit;")
        self.assertTrue(RUN.observed(self.db, 'svdt_expiry_holder', "wait_event='PgSleep'"))
        waiting = RUN.worker(self.db, 'svdt_expiry_client', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_expiry_client', "wait_event_type='Lock'"))
        self.assertEqual(RUN.finish(holder)[0], 0)
        code, _, error = RUN.finish(waiting)
        self.assertNotEqual(code, 0)
        self.assertIn('42501', error)
        self.assertEqual(self.counts(), dict(packages=0, requests=0, roster=0, compensation=0, people=0, users=2))

    def test_07_different_request_cannot_reuse_an_approval_after_waiting(self):
        first = RUN.worker(self.db, 'svdt_distinct_a', 'begin;' + self.actor(client=True) + self.apply_sql() + 'select pg_sleep(4);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_distinct_a', "wait_event='PgSleep'"))
        second = RUN.worker(self.db, 'svdt_distinct_b', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql(str(uuid.uuid4())))
        self.assertTrue(RUN.observed(self.db, 'svdt_distinct_b', "wait_event_type='Lock'"))
        self.assertEqual(RUN.finish(first)[0], 0)
        code, _, error = RUN.finish(second)
        self.assertNotEqual(code, 0)
        self.assertIn('CREW_IMPORT_APPROVAL_USED', error)
        self.assertEqual(self.counts(), dict(packages=1, requests=1, roster=1, compensation=1, people=0, users=2))

    def test_08_lost_client_result_after_commit_replays_without_duplicates(self):
        client = RUN.worker(self.db, 'svdt_lost_result', 'begin;' + self.actor(client=True) + self.apply_sql() + 'commit;select pg_sleep(4);')
        self.assertTrue(RUN.observed(self.db, 'svdt_lost_result', "wait_event='PgSleep'"))
        # The commit is known to have completed; deliberately never consume its result.
        client.kill()
        client.communicate(timeout=5)
        original = RUN.value(self.db, f"select response from public.crew_import_requests where request_id='{self.request}'")
        before = self.snapshot(self.db)
        for _ in range(2):
            self.assertEqual(RUN.value(self.db, self.actor(client=True) + self.apply_sql()), original)
        self.assertEqual(self.snapshot(self.db), before)
        self.assertEqual(self.counts(), dict(packages=1, requests=1, roster=1, compensation=1, people=0, users=2))

    def test_09_other_edition_waits_on_global_lock_without_mixing_data(self):
        second_edition = uid(202)
        RUN.sql(self.db, f"insert into public.events(id,name) values('{uid(201)}','Second synthetic');insert into public.editions(id,event_id,year,name) values('{second_edition}','{uid(201)}',2027,'Second synthetic');insert into public.edition_members values('{second_edition}','{uid(1)}','Synthetic admin','admin');")
        target = RUN.value(self.db, self.actor() + f"select public.crew_import_target_preview('{second_edition}')")
        mapping = {'editionId': second_edition, 'categories': {'cat1': {'id': uid(701), 'action': 'create'}},
                   'entries': {'w1': {'id': uid(801), 'action': 'create', 'compensationAction': 'create', 'kind': 'group'}}}
        plan = build_import_plan(self.source.encode(), mapping, target)['planText']
        approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{second_edition}',{literal(plan)},'{('b' * 64)}')")
        first = RUN.worker(self.db, 'svdt_year_a', 'begin;' + self.actor(client=True) + self.apply_sql() + 'select pg_sleep(4);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_year_a', "wait_event='PgSleep'"))
        sql = f"select public.crew_import_apply('{second_edition}','{approval}','{uuid.uuid4()}',{literal(plan)},{literal(self.source)});"
        second = RUN.worker(self.db, 'svdt_year_b', self.actor(client=True) + "set lock_timeout='8s';" + sql)
        self.assertTrue(RUN.observed(self.db, 'svdt_year_b', "wait_event_type='Lock' and exists(select 1 from pg_locks l where l.pid=pg_stat_activity.pid and l.mode='ShareRowExclusiveLock' and not l.granted)"))
        self.assertEqual(RUN.finish(first)[0], 0)
        self.assertEqual(RUN.finish(second)[0], 0)
        self.assertEqual(self.counts(), dict(packages=2, requests=2, roster=2, compensation=2, people=0, users=2))
        self.assertEqual(RUN.value(self.db, "select jsonb_agg(jsonb_build_array(id,edition_id) order by id) from public.crew_roster"), [[uid(601), uid(101)], [uid(801), second_edition]])

    def restart_owned_server_after_crash(self):
        marker = RUN.docker('inspect', '--format', '{{index .Config.Labels "svdt.acceptance.run"}}', RUN.container).stdout.strip()
        self.assertEqual(marker, RUN.token)
        RUN.docker('kill', '--signal', 'KILL', RUN.container)
        RUN.docker('start', RUN.container)
        binding = RUN.docker('port', RUN.container, '5432/tcp').stdout.strip()
        self.assertRegex(binding, r'^127\.0\.0\.1:[0-9]+$')
        port = int(binding.split(':')[1])
        credentials = {
            RUN.pass_file: f'127.0.0.1:{port}:*:{OWNER}:{RUN.password}\n',
            RUN.service_file: f'[synthetic]\nhost=127.0.0.1\nport={port}\nuser={OWNER}\ndbname=postgres\nsslmode=disable\n',
        }
        for path, text in credentials.items():
            fd = os.open(path, os.O_WRONLY | os.O_TRUNC | os.O_NOFOLLOW)
            with os.fdopen(fd, 'w') as out:
                out.write(text)
        deadline = time.monotonic() + 25
        while time.monotonic() < deadline:
            if RUN.sql('postgres', 'select 1', check=False).returncode == 0:
                return
            time.sleep(0.1)
        self.fail('Owned PostgreSQL did not recover after crash')

    def test_10_server_crash_rolls_back_pending_and_preserves_committed_import(self):
        before = self.snapshot(self.db)
        pending = RUN.worker(self.db, 'svdt_crash_pending', 'begin;' + self.actor(client=True) + self.apply_sql() + 'select pg_sleep(15);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_crash_pending', "wait_event='PgSleep'"))
        self.restart_owned_server_after_crash()
        self.assertNotEqual(RUN.finish(pending)[0], 0)
        self.assertEqual(self.snapshot(self.db), before)
        result = RUN.value(self.db, self.actor(client=True) + self.apply_sql())
        committed = self.snapshot(self.db)
        self.restart_owned_server_after_crash()
        self.assertEqual(self.snapshot(self.db), committed)
        self.assertEqual(RUN.value(self.db, self.actor(client=True) + self.apply_sql()), result)
        self.assertEqual(self.snapshot(self.db), committed)
        self.assertEqual(self.counts(), dict(packages=1, requests=1, roster=1, compensation=1, people=0, users=2))

    def probe_expiry_after_table_lock_must_deny_the_write(self):
        """Separate strict diagnostic, not an expected-failure or a passing test."""
        self.approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{uid(101)}',{literal(self.plan)},'{('b' * 64)}',clock_timestamp()+interval '2 seconds')")
        before = self.snapshot(self.db)
        # SHARE permits earlier reads/plan preparation, unlike ACCESS EXCLUSIVE.
        # Require the actual importer SHARE ROW EXCLUSIVE wait after its first expiry check.
        holder = RUN.worker(self.db, 'svdt_expiry_holder', 'begin;lock table public.crew_roster in share mode;select pg_sleep(4);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_expiry_holder', "wait_event='PgSleep'"))
        waiting = RUN.worker(self.db, 'svdt_expiry_client', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_expiry_client', "wait_event_type='Lock' and exists(select 1 from pg_locks l where l.pid=pg_stat_activity.pid and l.relation='public.crew_roster'::regclass and l.mode='ShareRowExclusiveLock' and not l.granted)"))
        self.assertEqual(RUN.finish(holder)[0], 0)
        code, _, error = RUN.finish(waiting)
        RUN.expiry_diagnostic = {
            'observedWaitMode': 'ShareRowExclusiveLock',
            'approvalExpiredAtCompletion': RUN.scalar(self.db, f"select expires_at<clock_timestamp() from public.crew_import_approvals where id='{self.approval}'") == 't',
            'sqlExitCode': code,
            'counts': self.counts(),
        }
        self.assertTrue(RUN.expiry_diagnostic['approvalExpiredAtCompletion'])
        self.assertNotEqual(code, 0)
        self.assertIn('42501', error)
        self.assertIn('CREW_IMPORT_APPROVAL_EXPIRED', error)
        self.assertEqual(self.counts(), dict(packages=0, requests=0, roster=0, compensation=0, people=0, users=2))
        self.assertEqual(self.snapshot(self.db), before)

    def test_11_live_approval_survives_short_table_wait_and_replays_after_expiry(self):
        self.approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{uid(101)}',{literal(self.plan)},'{('b' * 64)}',clock_timestamp()+interval '5 seconds')")
        holder = RUN.worker(self.db, 'svdt_valid_holder', 'begin;lock table public.crew_roster in share mode;select pg_sleep(1);commit;')
        self.assertTrue(RUN.observed(self.db, 'svdt_valid_holder', "wait_event='PgSleep'"))
        waiting = RUN.worker(self.db, 'svdt_valid_client', self.actor(client=True) + "set lock_timeout='8s';" + self.apply_sql())
        self.assertTrue(RUN.observed(self.db, 'svdt_valid_client', "wait_event_type='Lock' and exists(select 1 from pg_locks l where l.pid=pg_stat_activity.pid and l.relation='public.crew_roster'::regclass and l.mode='ShareRowExclusiveLock' and not l.granted)"))
        self.assertEqual(RUN.finish(holder)[0], 0)
        code, output, _ = RUN.finish(waiting)
        self.assertEqual(code, 0)
        result = json.loads(output)
        self.assertEqual(self.counts()['requests'], 1)
        RUN.sql(self.db, f"select pg_sleep(greatest(0,extract(epoch from(expires_at-clock_timestamp())))+0.02) from crew_import_approvals where id='{self.approval}'")
        self.assertEqual(RUN.scalar(self.db, f"select expires_at<=clock_timestamp() from crew_import_approvals where id='{self.approval}'"), 't')
        before = self.snapshot(self.db)
        self.assertEqual(RUN.value(self.db, self.actor(client=True) + self.apply_sql()), result)
        self.assertEqual(self.snapshot(self.db), before)

    def test_12_expiry_during_source_validation_prevents_first_insert(self):
        self.approval = RUN.scalar(self.db, self.actor() + f"select public.crew_import_stage_approval('{uid(101)}',{literal(self.plan)},'{('b' * 64)}',clock_timestamp()+interval '2 seconds')")
        # Synthetic latency wrapper only, never part of any application migration.
        RUN.sql(self.db, """alter function public.crew_import_source(text) rename to synthetic_original_source;
create function public.crew_import_source(text) returns jsonb language plpgsql volatile set search_path='' as $$
declare parsed jsonb;begin parsed:=public.synthetic_original_source($1);perform pg_sleep(3);return parsed;end;$$;
revoke all on function public.crew_import_source(text) from public,anon,authenticated;""")
        before = self.snapshot(self.db)
        failed = RUN.sql(self.db, self.actor(client=True) + self.apply_sql(), check=False)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn('42501', failed.stderr)
        self.assertIn('CREW_IMPORT_APPROVAL_EXPIRED', failed.stderr)
        self.assertEqual(self.snapshot(self.db), before)


def verify_sigterm(args, hard_kill=False, concurrent=False):
    """Own child PID only; checkpoints are read as evidence, never deletion commands."""
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Signal probe requires a private owned output root')
    directory = Path(tempfile.mkdtemp(prefix='sigkill-probe-' if hard_kill else 'sigterm-probe-', dir=root))
    command = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic', '--probe-interruption']
    for key in ('docker', 'docker_socket', 'pg_bin', 'node'):
        command.extend(['--' + key.replace('_', '-'), getattr(args, key)])
    command.extend(['--output-root', str(directory)])
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    contender = None
    try:
        deadline = time.monotonic() + 45
        checkpoint = None
        while time.monotonic() < deadline:
            require(child.poll() is None, 'Signal probe child exited before ready checkpoint')
            candidates = list(directory.glob('postgres-synthetic-*/checkpoint.json'))
            if len(candidates) == 1 and json.loads(candidates[0].read_text())['phase'] == 'ready':
                checkpoint = candidates[0]
                break
            time.sleep(0.1)
        require(checkpoint is not None, 'Signal probe child did not become ready')
        recovery_command = [arg for arg in command if arg != '--probe-interruption']
        recovery_command.extend(['--recover-owned-test', str(checkpoint)])
        def verify_busy():
            before = checkpoint.read_bytes()
            busy = subprocess.run(recovery_command, capture_output=True, text=True, timeout=15)
            receipt = json.loads(busy.stdout)
            require(busy.returncode == 1 and receipt['failureCategory'] == 'RECOVERY_BUSY'
                    and not receipt['successful'] and not receipt['containerRemoved'], 'Concurrent recovery did not refuse work')
            require(checkpoint.read_bytes() == before, 'Busy recovery changed checkpoint')
        if concurrent:
            verify_busy()
            require(child.poll() is None, 'Active owner was interrupted by recovery')
        child.send_signal(signal.SIGKILL if hard_kill else signal.SIGTERM)
        stdout, stderr = child.communicate(timeout=25)
        if hard_kill:
            require(child.returncode == -signal.SIGKILL and not (checkpoint.parent / 'report.json').exists(),
                    'Hard kill cannot report successful test completion')
            if concurrent:
                gated = [arg for arg in command if arg != '--probe-interruption']
                gated.extend(['--probe-recovery-contention', str(checkpoint)])
                contender = subprocess.Popen(gated, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                deadline = time.monotonic() + 10
                while not (checkpoint.parent / 'recovery-held.json').exists() and time.monotonic() < deadline:
                    require(contender.poll() is None, 'Recovery holder exited before contention probe')
                    time.sleep(0.05)
                require((checkpoint.parent / 'recovery-held.json').is_file(), 'Recovery holder did not acquire lock')
                verify_busy()
                SyntheticServer.private_write(checkpoint.parent / 'recovery-release.json', '{"release":true}\n')
                out, err = contender.communicate(timeout=40)
                receipt = json.loads(out)
                require(contender.returncode == 0 and receipt['successful'] and not receipt['alreadyAbsent'], 'First recovery did not complete')
            for attempt in range(2):
                recovered = subprocess.run(recovery_command, capture_output=True, text=True, timeout=40, check=True)
                receipt = json.loads(recovered.stdout)
                require(receipt['successful'] and not receipt['testSuiteSuccessful']
                        and receipt['alreadyAbsent'] == (concurrent or attempt == 1), 'Recovery/repeat receipt mismatch')
        else:
            require(child.returncode == 128 + signal.SIGTERM, 'Interrupted test must not report normal success')
            report = json.loads((checkpoint.parent / 'report.json').read_text())
            require(report['interruptedBy'] == signal.SIGTERM and not report['successful'] and report['casesRun'] == 0,
                    'Invalid interruption receipt')
            require(report['containerRemoved'] and report['anonymousVolumesRemoved'], 'Interruption cleanup failed')
        state = json.loads(checkpoint.read_text())
        require(state['phase'] == 'cleaned', 'Checkpoint not cleaned')
        require(re.fullmatch('[0-9a-f]{64}', state['containerId'])
                and all(re.fullmatch('[0-9a-f]{64}', name) for name in state['anonymousVolumes']), 'Invalid resource receipt')
        observer = object.__new__(SyntheticServer)
        observer.args = args
        observer.docker_config = checkpoint.parent / 'docker-client'
        require(confirmed_absence(observer.docker('inspect', '--format', '{{.Id}}', state['containerId'], check=False), 'object'), 'Removed container not independently confirmed')
        for name in state['anonymousVolumes']:
            require(confirmed_absence(observer.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'), 'Removed volume not independently confirmed')
        require(all(not (checkpoint.parent / name).exists() for name in ('password', 'pgpass', 'services')), 'Disposable credential remains')
        result = {'version': 1, 'mode': 'controlled_concurrent_recovery_probe' if concurrent else 'controlled_sigkill_recovery_probe' if hard_kill else 'controlled_sigterm_probe', 'successful': True,
                  'childExitCode': child.returncode, 'checkpointCleaned': True,
                  'containerRemoved': True, 'anonymousVolumesRemoved': True, 'disposableCredentialsRemoved': True,
                  'liveImportRun': False, 'forcedKillRecoveryVerified': hard_kill, 'repeatedRecoveryVerified': hard_kill}
        if concurrent:
            result.update(activeRunProtectedVerified=True, secondRecoveryBusyVerified=True)
        persist_report(result, directory / 'report.json', SyntheticServer.private_write)
        print(json.dumps(result), flush=True)
        return 0 if result['successful'] else 1
    finally:
        if contender is not None and contender.poll() is None:
            contender.terminate()
            try:
                contender.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                contender.kill()
                contender.communicate(timeout=5)
        if child.poll() is None:
            child.terminate()
            try:
                child.communicate(timeout=25)
            except subprocess.TimeoutExpired:
                child.kill()
                child.communicate(timeout=5)
                raise RuntimeError('Signal probe failed; inspect private checkpoint, never prune other resources')


def verify_startup_failures(args):
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Startup probe requires a private owned output root')
    directory = Path(tempfile.mkdtemp(prefix='startup-failure-probe-', dir=root))
    cases = []
    for stage in ('prepared', 'receipt', 'start', 'readiness'):
        case_root = directory / stage
        case_root.mkdir(mode=0o700)
        command = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic', '--probe-startup-failure', stage]
        for key in ('docker', 'docker_socket', 'pg_bin', 'node'):
            command.extend(['--' + key.replace('_', '-'), getattr(args, key)])
        command.extend(['--output-root', str(case_root)])
        child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            stdout, stderr = child.communicate(timeout=50)
            require(child.returncode == 1, 'Failed startup must not report normal success')
            report = json.loads(stdout)
            require(report['failureCategory'] == 'STARTUP_FAILED' and report['casesRun'] == 0
                    and not report['successful'] and not report['manualReviewRequired'], 'Invalid startup failure receipt')
            require(report['containerRemoved'] and report['anonymousVolumesRemoved'], 'Startup cleanup not verified')
            checkpoints = list(case_root.glob('postgres-synthetic-*/checkpoint.json'))
            require(len(checkpoints) == 1, 'Startup checkpoint missing')
            checkpoint = checkpoints[0]
            state = json.loads(checkpoint.read_text())
            require(state['version'] == 2 and state['phase'] == 'cleaned', 'Startup checkpoint not cleaned')
            require(report['startupRecovery']['identityRecoveredFromLive'] == (stage == 'receipt'), 'Wrong identity recovery evidence')
            recovery_command = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic',
                                '--recover-owned-test', str(checkpoint)]
            for key in ('docker', 'docker_socket', 'pg_bin', 'node'):
                recovery_command.extend(['--' + key.replace('_', '-'), getattr(args, key)])
            recovery_command.extend(['--output-root', str(case_root)])
            repeated = subprocess.run(recovery_command, capture_output=True, text=True, timeout=25, check=True)
            repeated_report = json.loads(repeated.stdout)
            require(repeated_report['alreadyAbsent'] and repeated_report['containerRemoved']
                    and repeated_report['anonymousVolumesRemoved'] and not repeated_report['testSuiteSuccessful'],
                    'Failed-startup recovery is not idempotent')
            observer = object.__new__(SyntheticServer)
            observer.args = args
            observer.docker_config = checkpoint.parent / 'docker-client'
            require(confirmed_absence(observer.docker('inspect', '--format', '{{.Id}}', state['containerId'] or state['name'], check=False), 'object'),
                    'Failed-startup container absence not confirmed')
            for name in state['anonymousVolumes']:
                require(confirmed_absence(observer.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'),
                        'Failed-startup volume absence not confirmed')
            require(all(not (checkpoint.parent / name).exists() for name in ('password', 'pgpass', 'services')), 'Startup credential remains')
            cases.append({'stage': stage, 'childExitCode': 1, 'startupFailed': True, 'cleanupVerified': True,
                          'containerWasCreated': stage != 'prepared',
                          'repeatedRecoveryVerified': True,
                          'identityRecoveredFromLive': report['startupRecovery']['identityRecoveredFromLive']})
        finally:
            if child.poll() is None:
                child.terminate()
                try:
                    child.communicate(timeout=25)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.communicate(timeout=5)
                    raise RuntimeError('Startup probe interrupted; preserve checkpoint for owned recovery')
    result = {'version': 1, 'mode': 'controlled_startup_failure_probe', 'successful': True,
              'casesVerified': len(cases), 'cases': cases, 'cutoverReady': False, 'liveImportRun': False}
    persist_report(result, directory / 'report.json', SyntheticServer.private_write)
    print(json.dumps(result), flush=True)
    return 0 if result['successful'] else 1


def verify_evidence_failures(args):
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Evidence probe requires a private owned output root')
    directory = Path(tempfile.mkdtemp(prefix='evidence-failure-probe-', dir=root))
    cases = []
    for stage in ('checkpoint-created', 'checkpoint-cleaning', 'report', 'after-remove', 'after-checkpoint', 'after-report'):
        case_root = directory / stage
        case_root.mkdir(mode=0o700)
        common = []
        for key in ('docker', 'docker_socket', 'pg_bin', 'node'):
            common.extend(['--' + key.replace('_', '-'), getattr(args, key)])
        common.extend(['--output-root', str(case_root)])
        prefix = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic']
        child = subprocess.Popen(prefix + ['--probe-evidence-failure', stage] + common,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            stdout, stderr = child.communicate(timeout=50)
            require(child.returncode == 1, 'Evidence I/O failure must not report success')
            report = json.loads(stdout)
            require(not report['successful'] and report['casesRun'] == 0, 'Invalid evidence fault result')
            checkpoints = list(case_root.glob('postgres-synthetic-*/checkpoint.json'))
            require(len(checkpoints) == 1, 'Evidence fault checkpoint missing')
            checkpoint = checkpoints[0]
            _, state, _ = read_checkpoint(checkpoint, IMAGE)
            deferred = stage == 'checkpoint-cleaning'
            uncertain = stage in ('after-remove', 'after-checkpoint')
            expected_phase = 'ready' if deferred else 'cleaning' if stage == 'after-remove' else 'cleaned'
            require(state['phase'] == expected_phase, 'Previous complete checkpoint lost')
            require(report['containerRemoved'] == (not deferred and not uncertain), 'Cleanup incorrectly claimed')
            require(report['reportPersisted'] == (stage != 'report'), 'Report persistence incorrectly claimed')
            require((checkpoint.parent / 'report.json').exists() == (stage != 'report'), 'Partial report published')
            require(not list(checkpoint.parent.glob('.checkpoint-*'))
                    and not list(checkpoint.parent.glob('.private-*')), 'Temporary evidence remains')
            if deferred:
                require(report['cleanupErrorCategory'] == 'OSError' and report['manualReviewRequired'], 'Missing checkpoint write diagnosis')
                require((checkpoint.parent / 'password').is_file(), 'Credentials lost before verified cleanup')
            if stage == 'report':
                require(report['reportFailure'] == 'REPORT_WRITE_FAILED' and report['manualReviewRequired'], 'Missing report failure diagnosis')
            if stage == 'after-report':
                require(report['reportFailure'] == 'REPORT_FINALIZATION_FAILED' and report['manualReviewRequired'], 'Missing post-publication diagnosis')
            for attempt in range(2):
                recovered = subprocess.run(prefix + ['--recover-owned-test', str(checkpoint)] + common,
                                           capture_output=True, text=True, timeout=40, check=True)
                receipt = json.loads(recovered.stdout)
                require(receipt['successful'] and receipt['reportPersisted'] and not receipt['testSuiteSuccessful']
                        and receipt['alreadyAbsent'] == (not deferred or attempt == 1), 'Evidence recovery receipt mismatch')
            _, final, _ = read_checkpoint(checkpoint, IMAGE)
            require(final['phase'] == 'cleaned', 'Evidence recovery incomplete')
            observer = object.__new__(SyntheticServer)
            observer.args, observer.docker_config = args, checkpoint.parent / 'docker-client'
            require(confirmed_absence(observer.docker('inspect', '--format', '{{.Id}}', final['containerId'], check=False), 'object'),
                    'Evidence container absence unconfirmed')
            for name in final['anonymousVolumes']:
                require(confirmed_absence(observer.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'),
                        'Evidence volume absence unconfirmed')
            require(all(not (checkpoint.parent / name).exists() for name in ('password', 'pgpass', 'services')), 'Evidence credential remains')
            cases.append({'stage': stage, 'childExitCode': 1, 'cleanupInitiallyDeferred': deferred,
                          'reportInitiallyPersisted': report['reportPersisted'], 'freshRecoveryVerified': True,
                          'initialCheckpointPhase': state['phase'],
                          'repeatedRecoveryVerified': True, 'finalCleanupVerified': True})
        finally:
            if child.poll() is None:
                child.terminate()
                try:
                    child.communicate(timeout=25)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.communicate(timeout=5)
                    raise RuntimeError('Evidence probe interrupted; preserve checkpoint for owned recovery')
    result = {'version': 1, 'mode': 'controlled_evidence_failure_probe', 'successful': True,
              'casesVerified': len(cases), 'cases': cases, 'cutoverReady': False, 'liveImportRun': False}
    persist_report(result, directory / 'report.json', SyntheticServer.private_write)
    print(json.dumps(result), flush=True)
    return 0 if result['successful'] else 1


def verify_recovery_interruption(args):
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Recovery interruption probe requires a private owned root')
    directory = Path(tempfile.mkdtemp(prefix='recovery-interruption-probe-', dir=root))
    cases = []
    for stage in RECOVERY_STAGES:
        case_root = directory / stage
        case_root.mkdir(mode=0o700)
        common = []
        for key in ('docker', 'docker_socket', 'pg_bin', 'node'):
            common.extend(['--' + key.replace('_', '-'), getattr(args, key)])
        common.extend(['--output-root', str(case_root)])
        prefix = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic']
        owner = subprocess.Popen(prefix + ['--probe-interruption'] + common,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        recovery = None
        try:
            deadline = time.monotonic() + 45
            checkpoint = None
            while time.monotonic() < deadline:
                require(owner.poll() is None, 'Owned test exited before ready')
                found = list(case_root.glob('postgres-synthetic-*/checkpoint.json'))
                if len(found) == 1 and json.loads(found[0].read_text())['phase'] == 'ready':
                    checkpoint = found[0]
                    break
                time.sleep(0.05)
            require(checkpoint is not None, 'No ready checkpoint for recovery interruption')
            owner.kill()
            owner.communicate(timeout=5)
            require(owner.returncode == -signal.SIGKILL, 'Only owned test process may be killed')
            recovery = subprocess.Popen(prefix + ['--probe-recovery-interruption', stage, str(checkpoint)] + common,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            marker = checkpoint.parent / ('recovery-paused-' + stage + '.json')
            deadline = time.monotonic() + 40
            while not marker.exists() and time.monotonic() < deadline:
                require(recovery.poll() is None, 'Recovery exited before interruption point')
                time.sleep(0.05)
            require(marker.is_file(), 'Recovery interruption point not reached')
            _, state, raw = read_checkpoint(checkpoint, IMAGE)
            expected = 'ready' if stage == 'verified' else 'cleaning' if stage in ('removed', 'credentials') else 'cleaned'
            require(state['phase'] == expected, 'Wrong checkpoint at recovery interruption')
            before = inventory_residues(case_root)
            require(before['complete'] and not before['contentRead'] and not before['filesDeleted'], 'Inventory incomplete or mutating')
            recover_command = prefix + ['--recover-owned-test', str(checkpoint)] + common
            busy = subprocess.run(recover_command, capture_output=True, text=True, timeout=15)
            require(busy.returncode == 1 and json.loads(busy.stdout)['failureCategory'] == 'RECOVERY_BUSY'
                    and checkpoint.read_bytes() == raw, 'Interrupted recovery did not hold exclusive lease')
            recovery.kill()
            output, _ = recovery.communicate(timeout=5)
            require(recovery.returncode == -signal.SIGKILL and not output.strip(), 'Killed recovery cannot have a final successful reply')
            require(checkpoint.read_bytes() == raw, 'Recovery checkpoint changed after controlled pause')
            for attempt in range(2):
                resumed = subprocess.run(recover_command, capture_output=True, text=True, timeout=40, check=True)
                receipt = json.loads(resumed.stdout)
                require(receipt['successful'] and not receipt['testSuiteSuccessful'] and receipt['reportPersisted']
                        and receipt['alreadyAbsent'] == (stage != 'verified' or attempt == 1), 'Recovery after interruption mismatch')
            _, final, _ = read_checkpoint(checkpoint, IMAGE)
            require(final['phase'] == 'cleaned', 'Resumed recovery not cleaned')
            observer = object.__new__(SyntheticServer)
            observer.args, observer.docker_config = args, checkpoint.parent / 'docker-client'
            require(confirmed_absence(observer.docker('inspect', '--format', '{{.Id}}', final['containerId'], check=False), 'object'),
                    'Interrupted-recovery container absence unconfirmed')
            for name in final['anonymousVolumes']:
                require(confirmed_absence(observer.docker('volume', 'inspect', '--format', '{{.Name}}', name, check=False), 'volume'),
                        'Interrupted-recovery volume absence unconfirmed')
            after = inventory_residues(case_root)
            require(after['complete'] and all(after['summary'].get(name, 0) == 0 for name in ('credential', 'temporaryPrivate', 'temporaryCheckpoint')),
                    'Private recovery residues remain')
            cases.append({'stage': stage, 'recoveryExitCode': -signal.SIGKILL, 'checkpointPhaseAtKill': state['phase'],
                          'exclusiveLeaseVerified': True, 'freshRecoveryVerified': True, 'repeatedRecoveryVerified': True,
                          'finalCleanupVerified': True, 'inventoryBefore': before['summary'], 'inventoryAfter': after['summary']})
        finally:
            for process in (recovery, owner):
                if process is not None and process.poll() is None:
                    process.kill()
                    process.communicate(timeout=5)
    result = {'version': 1, 'mode': 'controlled_recovery_interruption_probe', 'successful': True,
              'casesVerified': len(cases), 'cases': cases, 'cutoverReady': False, 'liveImportRun': False}
    persist_report(result, directory / 'report.json', SyntheticServer.private_write)
    print(json.dumps(result), flush=True)
    return 0 if result['successful'] else 1


def probe_partial_write(args):
    global WRITE_PROBE
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Partial-write probe requires a private owned root')
    server = object.__new__(SyntheticServer)
    server.args, server.folder = args, Path(tempfile.mkdtemp(prefix='postgres-synthetic-', dir=root))
    server.token = uuid.uuid4().hex
    server.name, server.container, server.volumes = 'svdt-synthetic-' + server.token, None, []
    with operation_lock(server.folder):
        server.checkpoint('prepared')
        baseline = hashlib.sha256((server.folder / 'checkpoint.json').read_bytes()).hexdigest()
        WRITE_PROBE = {'stage': args.probe_partial_write, 'baselineSha256': baseline}
        try:
            if args.probe_partial_write.startswith('checkpoint-'):
                server.checkpoint('creating')
            else:
                server.private_write(server.folder / 'report.json', json.dumps({'synthetic': True, 'payload': 'synthetic-only-' * 20}) + '\n')
        finally:
            WRITE_PROBE = None
    raise RuntimeError('Partial-write probe did not pause')


def verify_partial_writes(args):
    root = Path(args.output_root).resolve()
    require(root.is_dir() and root.stat().st_uid == os.getuid() and root.stat().st_mode & 0o077 == 0,
            'Partial-write verification requires a private owned root')
    directory = Path(tempfile.mkdtemp(prefix='partial-write-probe-', dir=root))
    cases = []
    for stage in WRITE_STAGES:
        case_root = directory / stage
        case_root.mkdir(mode=0o700)
        command = [sys.executable, '-B', str(Path(__file__).resolve()), '--run-synthetic',
                   '--probe-partial-write', stage, '--output-root', str(case_root)]
        child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            deadline = time.monotonic() + 10
            marker = None
            while time.monotonic() < deadline:
                require(child.poll() is None, 'Writer exited before controlled pause')
                found = list(case_root.glob('postgres-synthetic-*/write-paused-' + stage + '.json'))
                if len(found) == 1:
                    marker = found[0]
                    break
                time.sleep(0.05)
            require(marker is not None, 'Writer did not reach controlled pause')
            checkpoint = marker.parent / 'checkpoint.json'
            _, state, raw = read_checkpoint(checkpoint, IMAGE)
            metadata = json.loads(marker.read_text())
            require(state['phase'] == 'prepared' and hashlib.sha256(raw).hexdigest() == metadata['baselineSha256'],
                    'Previous checkpoint was replaced before publication')
            require(not (marker.parent / 'report.json').exists(), 'Unpublished report has a final name')
            with contextlib.ExitStack() as stack:
                try:
                    stack.enter_context(operation_lock(marker.parent))
                except RecoveryBusy:
                    pass
                else:
                    raise RuntimeError('Writer did not hold its lease')
            before = inventory_residues(case_root)
            category = 'temporaryCheckpoint' if stage.startswith('checkpoint-') else 'temporaryPrivate'
            files = [f for f in before['findings'] if f['category'] == category]
            require(before['complete'] and len(files) == 1 and files[0]['kind'] == 'file'
                    and files[0]['bytes'] > 0 and files[0]['permissions'] == '0o600', 'Temporary write metadata invalid')
            child.kill()
            out, _ = child.communicate(timeout=5)
            require(child.returncode == -signal.SIGKILL and not out.strip(), 'Killed writer cannot report success')
            with operation_lock(marker.parent):
                require(checkpoint.read_bytes() == raw, 'Previous checkpoint lost after writer kill')
            after = inventory_residues(case_root)
            remaining = [f for f in after['findings'] if f['category'] == category]
            require(after['complete'] and remaining == files and not (marker.parent / 'report.json').exists(),
                    'Unpublished evidence was lost or published after writer kill')
            cases.append({'stage': stage, 'childExitCode': -signal.SIGKILL, 'checkpointUnchanged': True,
                          'finalReportAbsent': True, 'leaseReleased': True, 'temporaryPreserved': True,
                          'temporaryCategory': category, 'temporaryBytes': files[0]['bytes'],
                          'inventoryContentRead': False, 'inventoryDeletedFiles': False})
        finally:
            if child.poll() is None:
                child.kill()
                child.communicate(timeout=5)
    result = {'version': 1, 'mode': 'controlled_partial_write_probe', 'successful': True,
              'casesVerified': len(cases), 'cases': cases, 'dockerContacted': False, 'resourcesCreated': False,
              'preservedTemporaryFiles': len(cases), 'automaticResidueDeletionAllowed': False,
              'cutoverReady': False, 'liveImportRun': False}
    persist_report(result, directory / 'report.json', SyntheticServer.private_write)
    print(json.dumps(result), flush=True)
    return 0 if result['successful'] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-synthetic', action='store_true', required=True)
    parser.add_argument('--docker')
    parser.add_argument('--docker-socket')
    parser.add_argument('--pg-bin')
    parser.add_argument('--node')
    parser.add_argument('--output-root', required=True)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--probe-interruption', action='store_true', help='Only for the controlled signal probe; waits at most30 seconds')
    mode.add_argument('--probe-expiry-after-lock', action='store_true', help='Strict isolated diagnostic of expiration after table-lock waiting')
    mode.add_argument('--verify-sigterm', action='store_true', help='Create an owned child and independently verify its SIGTERM cleanup')
    mode.add_argument('--verify-hard-kill', action='store_true', help='Kill only the owned child, recover in a new process and repeat safely')
    mode.add_argument('--verify-concurrent-recovery', action='store_true', help='Verify active-owner and competing recovery exclusion')
    mode.add_argument('--verify-recovery-interruption', action='store_true', help='Kill owned recovery at five controlled points and resume')
    mode.add_argument('--inventory-residues', action='store_true', help='Read-only metadata inventory; no Docker, file content or cleanup')
    mode.add_argument('--verify-partial-writes', action='store_true', help='Kill four owned filesystem writers without Docker')
    mode.add_argument('--probe-partial-write', choices=WRITE_STAGES, help='Controlled synthetic-only unpublished write pause')
    mode.add_argument('--recover-owned-test', metavar='CHECKPOINT', help='Explicit recovery after independent live ownership/storage verification')
    mode.add_argument('--probe-recovery-contention', metavar='CHECKPOINT', help='Controlled recovery holder with a bounded private gate')
    mode.add_argument('--probe-recovery-interruption', nargs=2, metavar=('STAGE', 'CHECKPOINT'), help='Controlled recovery pause for owned SIGKILL probe')
    mode.add_argument('--probe-startup-failure', choices=['prepared', 'receipt', 'start', 'readiness'], help='Controlled fault in the owned disposable server startup')
    mode.add_argument('--verify-startup-failures', action='store_true', help='Verify four controlled startup faults and their cleanup')
    mode.add_argument('--probe-evidence-failure', choices=['checkpoint-created', 'checkpoint-cleaning', 'report', 'after-remove', 'after-checkpoint', 'after-report'], help='Controlled private evidence publication fault')
    mode.add_argument('--verify-evidence-failures', action='store_true', help='Verify controlled evidence I/O faults and fresh recovery')
    args = parser.parse_args()
    if args.inventory_residues:
        try:
            report = inventory_residues(args.output_root)
        except Exception as error:
            report = {'mode': 'synthetic_residue_inventory', 'successful': False, 'complete': False,
                      'failureCategory': 'INVENTORY_FAILED', 'errorCategory': type(error).__name__,
                      'contentRead': False, 'filesDeleted': False, 'dockerContacted': False, 'locksAcquired': False}
        print(json.dumps(report), flush=True)
        return 0 if report['successful'] else 1
    if args.verify_partial_writes:
        return verify_partial_writes(args)
    if args.probe_partial_write:
        return probe_partial_write(args)
    for name in ('docker', 'docker_socket', 'pg_bin', 'node'):
        if not getattr(args, name):
            parser.error('--' + name.replace('_', '-') + ' is required outside metadata inventory')
    if args.probe_recovery_interruption:
        if args.probe_recovery_interruption[0] not in RECOVERY_STAGES:
            parser.error('Invalid controlled recovery stage')
        args.probe_recovery_stage = args.probe_recovery_interruption[0]
    if args.verify_recovery_interruption:
        return verify_recovery_interruption(args)
    if args.verify_sigterm:
        return verify_sigterm(args)
    if args.verify_hard_kill:
        return verify_sigterm(args, hard_kill=True)
    if args.verify_concurrent_recovery:
        return verify_sigterm(args, hard_kill=True, concurrent=True)
    if args.recover_owned_test or args.probe_recovery_contention or args.probe_recovery_interruption:
        try:
            checkpoint = args.recover_owned_test or args.probe_recovery_contention or args.probe_recovery_interruption[1]
            report = recover_checkpoint(args, checkpoint, SyntheticServer, IMAGE, confirmed_absence)
        except Exception as error:
            report = {'mode': 'owned_synthetic_test_recovery', 'successful': False, 'testSuiteSuccessful': False,
                      'failureCategory': 'RECOVERY_BUSY' if isinstance(error, RecoveryBusy) else 'RECOVERY_FAILED', 'recoveryErrorCategory': type(error).__name__,
                      'containerRemoved': False, 'anonymousVolumesRemoved': False, 'reportPersisted': False,
                      'manualReviewRequired': not isinstance(error, RecoveryBusy), 'cutoverReady': False, 'liveImportRun': False}
        print(json.dumps(report), flush=True)
        return 0 if report['successful'] else 1
    if args.verify_startup_failures:
        return verify_startup_failures(args)
    if args.verify_evidence_failures:
        return verify_evidence_failures(args)
    global RUN
    RUN = None
    try:
        RUN = SyntheticServer(args)
    except Exception as error:
        # No Docker create is reachable before construction completes.
        report = {'mode': 'isolated_synthetic_postgres', 'successful': False, 'casesRun': 0,
                  'failureCategory': 'PREPARATION_FAILED', 'preparationErrorCategory': type(error).__name__,
                  'reportPersisted': False, 'manualReviewRequired': True, 'containerCreationAttempted': False,
                  'cutoverReady': False, 'liveImportRun': False}
        print(json.dumps(report), flush=True)
        return 1
    try:
        return run_owned(args)
    finally:
        release_lease(RUN)


def release_lease(server):
    lease = getattr(server, 'lease', None)
    if lease is not None:
        server.lease = None
        lease.__exit__(None, None, None)


def run_owned(args):
    result = None
    removed = False
    interrupted = None
    started = False
    failure = None
    cleanup_error = None
    cleanup_receipt = None
    previous = {sig: signal.signal(sig, interrupt_test) for sig in (signal.SIGINT, signal.SIGTERM)}
    try:
        RUN.start()
        started = True
        if args.probe_evidence_failure:
            failure = 'CONTROLLED_IO_PROBE'
        elif args.probe_interruption:
            time.sleep(30)
            raise RuntimeError('Interruption probe did not receive a signal')
        else:
            suite = (unittest.TestSuite([PostgresAcceptance('probe_expiry_after_table_lock_must_deny_the_write')])
                     if args.probe_expiry_after_lock else unittest.defaultTestLoader.loadTestsFromTestCase(PostgresAcceptance))
            result = unittest.TextTestRunner(verbosity=2).run(suite)
    except SyntheticInterrupted as error:
        interrupted = error.signum
    except Exception as error:
        failure = 'STARTUP_FAILED' if not started else 'TEST_RUN_FAILED'
    finally:
        try:
            if started:
                removed = RUN.cleanup()
            else:
                release_lease(RUN)
                cleanup_receipt = recover_checkpoint(args, RUN.folder / 'checkpoint.json', SyntheticServer, IMAGE, confirmed_absence)
                removed = cleanup_receipt['containerRemoved']
        except Exception as error:
            cleanup_error = type(error).__name__
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
    report = {'version': 1, 'mode': 'isolated_synthetic_postgres', 'image': IMAGE,
              'serverVersion': getattr(RUN, 'version', None), 'casesRun': result.testsRun if result else 0,
              'casesPassed': result.testsRun - len(result.failures) - len(result.errors) if result else 0,
              'successful': bool(result and result.wasSuccessful() and not failure and not cleanup_error),
              'interruptedBy': interrupted, 'containerRemoved': removed,
              'failureCategory': failure, 'cleanupErrorCategory': cleanup_error,
              'manualReviewRequired': cleanup_error is not None or bool(cleanup_receipt and cleanup_receipt.get('manualReviewRequired')),
              'startupFailureStage': args.probe_startup_failure, 'startupRecovery': cleanup_receipt,
              'expiryDiagnostic': getattr(RUN, 'expiry_diagnostic', None), 'cutoverReady': False,
              'anonymousVolumesRemoved': cleanup_receipt['anonymousVolumesRemoved'] if cleanup_receipt else removed and bool(RUN.volumes),
              'applicationRuntimeChanged': bool(getattr(RUN, 'expiry_guard_applied', False)),
              'expiryGuardMigrationApplied': bool(getattr(RUN, 'expiry_guard_applied', False)),
              'expiryGuardIdentityAndAclPreserved': bool(getattr(RUN, 'expiry_guard_identity_preserved', False)),
              'realSourceOpened': False, 'liveImportRun': False,
              'liveAuthProviderVerified': False, 'storageBytesRestored': False, 'offsiteBackupActivated': False}
    path = RUN.folder / 'report.json'
    persist_report(report, path, RUN.report_writer)
    print(json.dumps(report), flush=True)
    if interrupted is not None:
        return 128 + interrupted
    return 0 if report['successful'] and removed else 1


if __name__ == '__main__':
    raise SystemExit(main())
