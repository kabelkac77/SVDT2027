"""Independent synthetic fault probes, intentionally not given to the model."""
import hashlib
import importlib.util
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest

root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('crew_qa_source',root/'event-app/tests/crew_workspace_test.py')
qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
crew=qa.crew

class SnapshotHostChecks(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.store=crew.CrewStore(self.tmp.name,qa.seed())
        self.connection=self.store.db
        self.snapshot=next((Path(self.tmp.name)/'backups').glob('*.sqlite3'))
        self.before=self.store.payload()
    def tearDown(self):
        self.store.db=self.connection;self.connection.close();self.tmp.cleanup()
    def fault_source(self,callback):
        connection=self.connection
        class Proxy:
            def backup(self,target):return callback(target)
            def __getattr__(self,name):return getattr(connection,name)
        self.store.db=Proxy()
    def test_interruption_leaves_no_final_and_retry_recovers(self):
        self.snapshot.unlink()
        def interrupted(target):
            target.execute('CREATE TABLE partial_only(x)');target.commit()
            raise OSError('synthetic write failure')
        self.fault_source(interrupted)
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.backup()
        self.assertFalse(self.snapshot.exists())
        self.store.db=self.connection;self.assertEqual(self.before,self.store.payload())
        self.store.backup()
        restored=sqlite3.connect(self.snapshot)
        try:
            self.assertEqual(restored.execute('SELECT COUNT(*) FROM history').fetchone()[0],3)
            self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0],'ok')
        finally:restored.close()
    def test_empty_sqlite_is_not_a_valid_completed_snapshot(self):
        self.snapshot.unlink();self.fault_source(lambda target:None)
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.backup()
        self.assertFalse(self.snapshot.exists())
    def test_incomplete_schema_is_not_a_restorable_snapshot(self):
        self.snapshot.unlink()
        def incomplete(target):
            target.execute('CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT)')
            target.execute("INSERT INTO meta VALUES('initialized','synthetic')")
            for table in ('history','categories','working','audit','requests'):
                target.execute('CREATE TABLE '+table+'(id TEXT PRIMARY KEY)')
            target.commit()
        self.fault_source(incomplete)
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.backup()
        self.assertFalse(self.snapshot.exists())
    def test_corrupt_existing_file_is_preserved_and_reported(self):
        self.snapshot.write_bytes(b'synthetic corrupt file')
        before=self.snapshot.read_bytes()
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.backup()
        self.assertEqual(self.snapshot.read_bytes(),before)
        self.assertEqual(self.store.payload(),self.before)
    def test_existing_symlink_is_preserved_and_target_untouched(self):
        self.snapshot.unlink();outside=Path(self.tmp.name)/'synthetic-target';outside.write_bytes(b'untouched')
        self.snapshot.symlink_to(outside)
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.backup()
        self.assertTrue(self.snapshot.is_symlink());self.assertEqual(outside.read_bytes(),b'untouched')
    def test_valid_daily_snapshot_is_not_overwritten_after_edit(self):
        digest=hashlib.sha256(self.snapshot.read_bytes()).digest()
        row=next(r for r in self.before['records'] if r['year']=='2027')
        request=qa.body(row);request['fields']['notes']='synthetic newer state'
        self.store.save_record(row['id'],request)
        self.store.backup()
        self.assertEqual(hashlib.sha256(self.snapshot.read_bytes()).digest(),digest)
    def test_failed_prewrite_does_not_consume_version_audit_or_request(self):
        self.snapshot.unlink();row=next(r for r in self.before['records'] if r['year']=='2027');request=qa.body(row)
        self.fault_source(lambda target:(_ for _ in ()).throw(OSError('synthetic fault')))
        with self.assertRaises((crew.Problem, crew.SnapshotError)):self.store.save_record(row['id'],request)
        self.store.db=self.connection
        self.assertEqual(self.store.payload(),self.before)
        self.assertEqual(self.connection.execute('SELECT COUNT(*) FROM audit').fetchone()[0],0)
        self.assertEqual(self.connection.execute('SELECT COUNT(*) FROM requests').fetchone()[0],0)
        result=self.store.save_record(row['id'],request)
        self.assertEqual(result['record']['version'],row['version']+1)
    def test_private_mode_before_first_snapshot_write(self):
        self.snapshot.unlink();modes=[]
        def inspect_then_copy(target):
            path=Path(target.execute('PRAGMA database_list').fetchone()[2])
            modes.append(path.stat().st_mode&0o777)
            self.connection.backup(target)
        self.fault_source(inspect_then_copy);self.store.backup()
        self.assertEqual(modes,[0o600])
        self.assertEqual(self.snapshot.stat().st_mode&0o777,0o600)

if __name__=='__main__':unittest.main()
