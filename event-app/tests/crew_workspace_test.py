"""Isolated fake-data tests for the local workspace. No production services."""
import copy
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import stat
import tempfile
import threading
import unittest
import uuid

spec=importlib.util.spec_from_file_location('crew_workspace',Path(__file__).resolve().parents[1]/'tools/crew_workspace.py')
crew=importlib.util.module_from_spec(spec)
spec.loader.exec_module(crew)

def seed():
    rows=[]
    for year,identifier in [('2026','source-1'),('2026','source-2'),('2025','older-1')]:
        raw=[{'label':label,'value':None} for label in crew.LABELS]
        raw[0]['value']='Fiktivní člověk '+identifier
        raw[5]['value']='qa@example.invalid'
        raw[7]['value']=2000
        raw[10]['value']=2000
        rows.append({'id':identifier,'year':year,'name':raw[0]['value'],'category':'Registrace','position':'Registrace','owner':'QA','email':'qa@example.invalid','phone':'','raw':raw,'status':'confirmed','cash':2000,'barter':'tričko','merch':'tričko','source':{'sheet':year,'row':1}})
    return {'records':rows,'sourceSha256':'fake-source-hash'}

def body(record):
    fields=copy.deepcopy(record['fields'])
    money=fields.pop('money')
    fields['amounts']={key:'' if value is None else f'{value//100},{value%100:02d}' for key,value in money.items()}
    return {'requestId':str(uuid.uuid4()),'version':record['version'],'year':'2027','fields':fields}

def fresh_source_db():
    # Use a complete schema from the existing synthetic fixture, with no real records.
    with tempfile.TemporaryDirectory() as directory:
        store=crew.CrewStore(directory,seed())
        db=sqlite3.connect(':memory:')
        try:
            store.db.backup(db)
        finally:
            store.db.close()
    return db


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.store=crew.CrewStore(self.temp.name,seed())

    def tearDown(self):
        self.store.db.close()
        self.temp.cleanup()

    def row(self):
        return next(r for r in self.store.payload()['records'] if r['year']=='2027')

    def historical(self):
        return crew.encoded([dict(r) for r in self.store.db.execute('SELECT * FROM history ORDER BY id')])

    def test_seed_resets_commitments_and_money_preserves_history(self):
        row=self.row()
        self.assertEqual(row['status'],'candidate')
        self.assertTrue(all(v is None for v in row['fields']['money'].values()))
        self.assertEqual(row['email'],'qa@example.invalid')
        self.assertEqual(len([r for r in self.store.payload()['records'] if r['year']=='2026']),2)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM categories WHERE name IN (?,?)',('Registrace','VIP')).fetchone()[0],2)

    def test_save_persists_after_database_reopen(self):
        row=self.row();request=body(row)
        request['fields']['name']='Fiktivní upravený člověk'
        request['fields']['amounts']['agreed']='1 234,50'
        result=self.store.save_record(row['id'],request)['record']
        self.assertEqual(result['fields']['money']['agreed'],123450)
        self.store.db.close()
        self.store=crew.CrewStore(self.temp.name,{'records':[]})
        self.assertEqual(self.row()['name'],'Fiktivní upravený člověk')
        self.assertEqual(self.row()['version'],2)

    def test_history_unchanged_and_not_writable(self):
        before=self.historical();row=self.row()
        request=body(row);request['fields']['notes']='Nová ročníková poznámka'
        self.store.save_record(row['id'],request)
        self.assertEqual(before,self.historical())
        request['year']='2026'
        with self.assertRaises(crew.Problem) as error:self.store.save_record('source-1',request)
        self.assertEqual(error.exception.status,403)
        with self.assertRaises(sqlite3.IntegrityError):self.store.db.execute("UPDATE history SET content='{}'")

    def test_stale_write_does_not_overwrite(self):
        row=self.row();first=body(row);second=body(row)
        first['fields']['name']='První změna';second['fields']['name']='Druhá změna'
        self.store.save_record(row['id'],first)
        with self.assertRaises(crew.Problem) as error:self.store.save_record(row['id'],second)
        self.assertEqual(error.exception.status,409)
        self.assertEqual(self.row()['name'],'První změna')

    def test_replay_does_not_duplicate_record_or_audit(self):
        row=self.row();request=body(row)
        first=self.store.save_record(row['id'],request)
        second=self.store.save_record(row['id'],request)
        self.assertEqual(first,second)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM audit').fetchone()[0],1)
        request['fields']['name']='Jiné údaje'
        with self.assertRaises(crew.Problem):self.store.save_record(row['id'],request)

    def test_invalid_money_is_atomic_and_null_is_not_zero(self):
        row=self.row();request=body(row)
        request['fields']['amounts']['agreed']='0'
        result=self.store.save_record(row['id'],request)['record']
        self.assertEqual(result['fields']['money']['agreed'],0)
        self.assertIsNone(result['fields']['money']['paid'])
        invalid=body(result);invalid['fields']['amounts']['paid']='1,234'
        with self.assertRaises(crew.Problem):self.store.save_record(row['id'],invalid)
        self.assertEqual(self.row()['version'],2)

    def test_confirmation_requires_term(self):
        row=self.row();request=body(row);request['fields']['status']='confirmed'
        with self.assertRaises(crew.Problem):self.store.save_record(row['id'],request)
        request['requestId']=str(uuid.uuid4());request['fields']['term']='Pátek příprava'
        self.assertEqual(self.store.save_record(row['id'],request)['record']['status'],'confirmed')

    def test_category_rename_and_color_keep_membership(self):
        row=self.row();cat=next(c for c in self.store.categories() if c['id']==row['categoryId'])
        self.store.save_category(cat['id'],{'requestId':str(uuid.uuid4()),'version':cat['version'],'name':'Registrace jezdců','color':'cat-5'})
        self.assertEqual(self.row()['category'],'Registrace jezdců')
        self.assertEqual(self.row()['categoryId'],row['categoryId'])
        self.assertEqual(next(c for c in self.store.categories() if c['id']==cat['id'])['color'],'cat-5')

    def test_move_archive_restore_and_new_person(self):
        row=self.row();request=body(row);vip=next(c for c in self.store.categories() if c['name']=='VIP')
        request['fields']['categoryId']=vip['id'];request['fields']['archived']=True
        saved=self.store.save_record(row['id'],request)['record']
        self.assertTrue(saved['archived']);self.assertEqual(saved['category'],'VIP')
        restore=body(saved);restore['fields']['archived']=False
        self.assertFalse(self.store.save_record(row['id'],restore)['record']['archived'])
        new=body(saved);new['version']=0;new['fields']['name']='Nový fiktivní člověk';new['fields']['archived']=False
        identifier=str(uuid.uuid4())
        self.assertIsNone(self.store.save_record(identifier,new)['record']['sourceId'])

    def test_recoverable_snapshot_and_export(self):
        row=self.row();request=body(row);request['fields']['notes']='Zapsáno'
        self.store.save_record(row['id'],request)
        snapshot=next((Path(self.temp.name)/'backups').glob('*.sqlite3'))
        restored=sqlite3.connect(snapshot)
        self.assertEqual(restored.execute('SELECT count(*) FROM history').fetchone()[0],3)
        self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        restored.close()
        exported=self.store.export()
        self.assertEqual(exported['format'],'svdt-local-crew-v1')
        self.assertEqual(len(exported['audit']),1)

    def test_backup_snapshot_has_private_permissions(self):
        snapshot=next((Path(self.temp.name)/'backups').glob('crew-*.sqlite3'))
        self.assertEqual(stat.S_IMODE(snapshot.stat().st_mode),0o600)

    def test_restore_snapshot_into_new_folder(self):
        row=self.row();request=body(row);request['fields']['notes']='Zápis před zálohou'
        self.store.save_record(row['id'],request)
        for existing in (Path(self.temp.name)/'backups').glob('crew-*.sqlite3'):
            existing.unlink()
        self.store.backup()
        snapshot=next((Path(self.temp.name)/'backups').glob('crew-*.sqlite3'))
        recovery=tempfile.TemporaryDirectory()
        try:
            recovered_path=Path(recovery.name)/'crew.sqlite3'
            shutil.copy2(snapshot,recovered_path)
            def fail_seed():
                raise AssertionError('Seed must not run for an already initialized snapshot')
            recovered=crew.CrewStore(recovery.name,fail_seed)
            try:
                recovered_row=next(r for r in recovered.payload()['records'] if r['year']=='2027' and r['id']==row['id'])
                self.assertEqual(recovered_row['fields']['notes'],'Zápis před zálohou')
            finally:
                recovered.db.close()
        finally:
            recovery.cleanup()

    def test_mutation_aborts_cleanly_when_backup_fails(self):
        row=self.row();request=body(row);request['fields']['notes']='Pokus během poruchy zálohy'
        original=crew.atomic_sqlite_snapshot
        def failing(*args,**kwargs):
            raise crew.SnapshotError('fake failure')
        crew.atomic_sqlite_snapshot=failing
        try:
            with self.assertRaises(crew.SnapshotError):
                self.store.save_record(row['id'],request)
        finally:
            crew.atomic_sqlite_snapshot=original
        self.assertEqual(self.row()['version'],1)
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM audit').fetchone()[0],0)
        retry=body(self.row());retry['fields']['notes']='Pokus během poruchy zálohy'
        result=self.store.save_record(row['id'],retry)['record']
        self.assertEqual(result['version'],2)
        self.assertEqual(result['fields']['notes'],'Pokus během poruchy zálohy')

class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.folder=Path(self.temp.name)
        self.target=self.folder/'crew-snapshot.sqlite3'

    def tearDown(self):
        self.temp.cleanup()

    def leftover_temp_files(self):
        return list(self.folder.glob('.crew-snapshot.sqlite3-*'))

    def test_snapshot_is_atomic_private_and_valid(self):
        source=fresh_source_db()
        self.assertTrue(crew.atomic_sqlite_snapshot(source,self.target))
        source.close()
        self.assertEqual(stat.S_IMODE(self.target.stat().st_mode),0o600)
        connection=sqlite3.connect(self.target)
        self.assertEqual(connection.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        connection.close()
        self.assertEqual(self.leftover_temp_files(),[])

    def test_existing_valid_target_is_not_overwritten(self):
        source=fresh_source_db()
        self.assertTrue(crew.atomic_sqlite_snapshot(source,self.target))
        before=self.target.read_bytes()
        self.assertFalse(crew.atomic_sqlite_snapshot(source,self.target))
        source.close()
        self.assertEqual(self.target.read_bytes(),before)
        self.assertEqual(self.leftover_temp_files(),[])

    def test_corrupted_target_preserved_and_retry_succeeds_after_removal(self):
        self.target.write_bytes(b'\x00\x01corrupt')
        source=fresh_source_db()
        with self.assertRaises(crew.SnapshotError):
            crew.atomic_sqlite_snapshot(source,self.target)
        self.assertEqual(self.target.read_bytes(),b'\x00\x01corrupt')
        self.target.unlink()
        self.assertTrue(crew.atomic_sqlite_snapshot(source,self.target))
        source.close()
        connection=sqlite3.connect(self.target)
        self.assertEqual(connection.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        connection.close()

    def test_symlink_target_is_not_followed_or_removed(self):
        decoy=self.folder/'decoy.sqlite3'
        decoy.write_bytes(b'decoy contents')
        self.target.symlink_to(decoy)
        source=fresh_source_db()
        with self.assertRaises(crew.SnapshotError):
            crew.atomic_sqlite_snapshot(source,self.target)
        source.close()
        self.assertTrue(self.target.is_symlink())
        self.assertEqual(self.target.readlink(),decoy)
        self.assertEqual(decoy.read_bytes(),b'decoy contents')

    def test_write_failure_preserves_source_and_allows_later_retry(self):
        incomplete=sqlite3.connect(':memory:')
        incomplete.execute("CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        incomplete.commit()
        with self.assertRaises(crew.SnapshotError):
            crew.atomic_sqlite_snapshot(incomplete,self.target)
        incomplete.close()
        self.assertFalse(os.path.lexists(self.target))
        self.assertEqual(self.leftover_temp_files(),[])
        source=fresh_source_db()
        self.assertTrue(crew.atomic_sqlite_snapshot(source,self.target))
        source.close()

    def test_concurrent_writers_produce_single_valid_winner(self):
        results=[];errors=[]
        def attempt():
            source=fresh_source_db()
            try:
                results.append(crew.atomic_sqlite_snapshot(source,self.target))
            except Exception as error:
                errors.append(error)
            finally:
                source.close()
        threads=[threading.Thread(target=attempt) for _ in range(8)]
        for thread in threads:thread.start()
        for thread in threads:thread.join()
        self.assertEqual(errors,[])
        self.assertEqual(len(results),8)
        self.assertEqual(results.count(True),1)
        connection=sqlite3.connect(self.target)
        self.assertEqual(connection.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        connection.close()
        self.assertEqual(self.leftover_temp_files(),[])

class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.store=crew.CrewStore(cls.temp.name,seed())
        cls.server=crew.CrewHTTPServer(('127.0.0.1',0),cls.store)
        cls.port=cls.server.server_address[1]
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.store.db.close();cls.temp.cleanup()

    def request(self,method,path,body=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',self.port)
        conn.request(method,path,body,headers or {})
        response=conn.getresponse();data=response.read();result=(response.status,dict(response.getheaders()),data);conn.close();return result

    def test_csrf_origin_and_host_guards(self):
        status,headers,data=self.request('GET','/api/bootstrap')
        self.assertEqual(status,200);token=json.loads(data)['token']
        self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertIn("frame-src 'self'",headers['Content-Security-Policy'])
        self.assertIn("frame-ancestors 'self'",headers['Content-Security-Policy'])
        row=next(r for r in json.loads(data)['payload']['records'] if r['year']=='2027')
        payload=json.dumps(body(row))
        origin=f'http://127.0.0.1:{self.port}'
        for bad_headers in [{'Content-Type':'application/json'},{'Content-Type':'application/json','Origin':'https://example.invalid','X-SVDT-CSRF':token}]:
            self.assertEqual(self.request('PUT','/api/records/'+row['id'],payload,bad_headers)[0],403)
        valid={'Content-Type':'application/json','Origin':origin,'X-SVDT-CSRF':token}
        self.assertEqual(self.request('PUT','/api/records/'+row['id'],payload,valid)[0],200)
        self.assertEqual(self.request('GET','/api/bootstrap',headers={'Host':'example.invalid'})[0],403)

    def test_private_files_not_served(self):
        for path in ['/crew.sqlite3','/../.local/crew-workspace/crew.sqlite3','/crew-private-data.js','/backups/']:
            self.assertEqual(self.request('GET',path)[0],404)
        status,_,html=self.request('GET','/crew.html')
        self.assertEqual(status,200);self.assertIn(b'crew-workspace.js',html);self.assertNotIn(b'crew-sheet-fixtures.js',html)

if __name__=='__main__':unittest.main()
