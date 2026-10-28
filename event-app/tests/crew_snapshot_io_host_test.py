"""Independent synthetic OS failure probes for the public snapshot contract."""
import importlib.util
import os
import sqlite3
from pathlib import Path
import unittest
from unittest.mock import patch

root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('snapshot_host_fixture',root/'event-app/tests/crew_snapshot_host_test.py')
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
crew=fixture.crew

@unittest.skipIf(getattr(os,'geteuid',lambda:0)()==0,'Permission failures require an unprivileged POSIX user')
class SnapshotIOHostChecks(unittest.TestCase):
    def setUp(self):fixture.SnapshotHostChecks.setUp(self)
    def tearDown(self):fixture.SnapshotHostChecks.tearDown(self)
    def test_creation_failure_has_safe_category_and_preserves_source(self):
        target=self.snapshot.with_name('synthetic-sensitive-marker.sqlite3')
        folder=target.parent;folder.chmod(0o500)
        try:
            with self.assertRaises(crew.SnapshotError) as error:
                crew.atomic_sqlite_snapshot(self.connection,target)
        finally:folder.chmod(0o700)
        self.assertNotIn(str(folder),str(error.exception))
        self.assertNotIn('synthetic-sensitive-marker',str(error.exception))
        self.assertFalse(target.exists())
        self.assertEqual(self.store.payload(),self.before)
    def test_cleanup_failure_has_safe_category_and_keeps_valid_published_file(self):
        target=self.snapshot.with_name('synthetic-sensitive-marker.sqlite3')
        folder=target.parent;original_link=os.link
        def publish_then_remove_write_permission(*args,**kwargs):
            result=original_link(*args,**kwargs);folder.chmod(0o500);return result
        try:
            with patch.object(crew.os,'link',side_effect=publish_then_remove_write_permission):
                with self.assertRaises(crew.SnapshotError) as error:
                    crew.atomic_sqlite_snapshot(self.connection,target)
        finally:folder.chmod(0o700)
        self.assertNotIn(str(folder),str(error.exception))
        self.assertNotIn('synthetic-sensitive-marker',str(error.exception))
        self.assertTrue(target.is_file())
        self.assertEqual(self.store.payload(),self.before)

class SnapshotValidationHostChecks(unittest.TestCase):
    def setUp(self):fixture.SnapshotHostChecks.setUp(self)
    def tearDown(self):fixture.SnapshotHostChecks.tearDown(self)
    def test_read_only_verification_never_creates_missing_file(self):
        target=self.snapshot.with_name('missing-synthetic.sqlite3')
        with self.assertRaises((crew.SnapshotError,sqlite3.Error)):
            crew.verify_snapshot(target)
        self.assertFalse(target.exists())
    def test_whitespace_initialization_is_not_valid_metadata(self):
        target=self.snapshot.with_name('blank-metadata.sqlite3')
        # Use a full synthetic schema; only the metadata field is invalid.
        for value in ('','   ','\t\n'):
            with self.subTest(value=repr(value)):
                memory=sqlite3.connect(':memory:');self.connection.backup(memory)
                memory.execute("UPDATE meta SET value=? WHERE key='initialized'",(value,));memory.commit()
                try:
                    with self.assertRaises(crew.SnapshotError):
                        crew.atomic_sqlite_snapshot(memory,target)
                finally:memory.close()
                self.assertFalse(target.exists())

if __name__=='__main__':unittest.main()
