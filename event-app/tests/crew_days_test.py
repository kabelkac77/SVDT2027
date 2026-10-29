"""Independent synthetic checks of day ranges and old-client compatibility."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest

root=Path(os.environ.get('CREW_DAY_TEST_ROOT',Path(__file__).resolve().parents[2]))
spec=importlib.util.spec_from_file_location('days_qa_fixture',root/'event-app/tests/crew_workspace_test.py')
qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
crew=qa.crew

class CrewDayChecks(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.store=crew.CrewStore(self.tmp.name,qa.seed())
    def tearDown(self):
        self.store.db.close();self.tmp.cleanup()
    def row(self):return next(r for r in self.store.payload()['records'] if r['year']=='2027')
    def saved(self,friday='08:00–16:00',saturday='07:30–18:00'):
        r=self.row();body=qa.body(r);body['fields'].update(friday=friday,saturday=saturday)
        return self.store.save_record(r['id'],body)['record']
    def db_state(self):
        return repr({name:[tuple(r) for r in self.store.db.execute('SELECT * FROM '+name)] for name in ['working','history','audit','requests']})
    def test_new_working_records_default_to_unknown_days(self):
        for r in self.store.payload()['records']:
            if r['year']=='2027':self.assertEqual((r['fields']['friday'],r['fields']['saturday']),('',''))
    def test_legacy_rows_are_read_with_defaults_without_rewriting_content(self):
        r=self.row();stored=self.store.db.execute('SELECT content FROM working WHERE id=?',(r['id'],)).fetchone()[0];f=json.loads(stored);f.pop('friday',None);f.pop('saturday',None)
        self.store.db.execute('UPDATE working SET content=? WHERE id=?',(crew.encoded(f),r['id']))
        before=self.db_state();loaded=self.row();self.assertEqual(loaded['fields']['friday'],'');self.assertEqual(loaded['fields']['saturday'],'');self.assertEqual(self.db_state(),before)
    def test_ranges_persist_after_database_reopen(self):
        self.saved();self.store.db.close();self.store=crew.CrewStore(self.tmp.name,{'records':[]})
        self.assertEqual((self.row()['fields']['friday'],self.row()['fields']['saturday']),('08:00–16:00','07:30–18:00'))
    def test_old_client_preserves_both_previously_saved_ranges(self):
        row=self.saved();request=qa.body(row);request['fields'].pop('friday');request['fields'].pop('saturday');request['fields']['notes']='Synthetic other edit';before=copy.deepcopy(request)
        result=self.store.save_record(row['id'],request)['record'];self.assertEqual(result['fields']['friday'],'08:00–16:00');self.assertEqual(result['fields']['saturday'],'07:30–18:00');self.assertEqual(request,before)
    def test_missing_one_day_preserves_it_while_explicit_blank_clears_other(self):
        row=self.saved();request=qa.body(row);request['fields'].pop('friday');request['fields']['saturday']='';result=self.store.save_record(row['id'],request)['record']
        self.assertEqual(result['fields']['friday'],'08:00–16:00');self.assertEqual(result['fields']['saturday'],'')
    def test_new_row_from_old_client_has_empty_days(self):
        request=qa.body(self.row());request['version']=0;request['fields'].pop('friday',None);request['fields'].pop('saturday',None)
        result=self.store.save_record('synthetic-new-days',request)['record'];self.assertEqual(result['fields']['friday'],'');self.assertEqual(result['fields']['saturday'],'')
    def test_invalid_range_types_are_rejected_atomically(self):
        for key in ['friday','saturday']:
            for value in [None,False,123,[],{},'x'*101,'08:00\x00–16:00']:
                with self.subTest(key=key,value_type=type(value).__name__):
                    request=qa.body(self.row());request['fields'][key]=value;before=self.db_state()
                    with self.assertRaises(crew.Problem) as error:self.store.save_record(self.row()['id'],request)
                    self.assertEqual(error.exception.status,422);self.assertEqual(self.db_state(),before)
    def test_manual_text_boundaries_and_whitespace_follow_existing_text_rules(self):
        row=self.saved('  08:00–16:00  ','x'*100);self.assertEqual(row['fields']['friday'],'08:00–16:00');self.assertEqual(row['fields']['saturday'],'x'*100)
    def test_new_days_do_not_confirm_attendance_or_replace_general_term(self):
        r=self.row();request=qa.body(r);request['fields'].update(friday='08:00–16:00',saturday='07:00–12:00',term='Separate synthetic term')
        result=self.store.save_record(r['id'],request)['record'];self.assertEqual(result['status'],'candidate');self.assertEqual(result['fields']['term'],'Separate synthetic term')
    def test_history_is_not_changed_or_populated_with_current_days(self):
        before=[dict(r) for r in self.store.db.execute('SELECT * FROM history ORDER BY id')];self.saved();after=[dict(r) for r in self.store.db.execute('SELECT * FROM history ORDER BY id')];self.assertEqual(before,after)
    def test_csv_extra_and_json_backup_retain_both_ranges(self):
        r=self.saved();extra={x['label']:x['value'] for x in r['extra']};self.assertEqual(extra['PÁ (od–do)'],'08:00–16:00');self.assertEqual(extra['SO (od–do)'],'07:30–18:00')
        exported=self.store.export();working=next(x for x in exported['payload']['records'] if x['id']==r['id']);self.assertEqual(working['fields']['friday'],r['fields']['friday'])
    def test_replay_does_not_duplicate_day_change_and_audit(self):
        r=self.row();request=qa.body(r);request['fields'].update(friday='08:00–16:00',saturday='07:00–12:00');a=self.store.save_record(r['id'],request);before=self.db_state();b=self.store.save_record(r['id'],request);self.assertEqual(a,b);self.assertEqual(self.db_state(),before)
    def test_stale_window_cannot_overwrite_new_ranges(self):
        r=self.row();stale=qa.body(r);saved=self.saved();stale['fields']['friday']='09:00–10:00'
        with self.assertRaises(crew.Problem) as error:self.store.save_record(r['id'],stale)
        self.assertEqual(error.exception.status,409);self.assertEqual(self.row()['fields']['friday'],saved['fields']['friday'])
    def test_unknown_field_and_missing_original_required_field_still_rejected(self):
        for bad in ['unknown','missing']:
            request=qa.body(self.row())
            if bad=='unknown':request['fields']['syntheticUnexpected']='x'
            else:request['fields'].pop('owner')
            with self.assertRaises(crew.Problem) as error:self.store.save_record(self.row()['id'],request)
            self.assertEqual(error.exception.status,422)
    def test_validate_does_not_mutate_previous_or_input(self):
        saved=self.saved();request=qa.body(saved);request['fields'].pop('friday');previous=copy.deepcopy(saved['fields']);incoming=copy.deepcopy(request['fields']);self.store.validate(request['fields'],previous)
        self.assertEqual(saved['fields'],previous);self.assertEqual(request['fields'],incoming)
    def test_saved_day_values_are_present_in_audit(self):
        r=self.saved();audit=json.loads(self.store.db.execute('SELECT after_json FROM audit ORDER BY id DESC LIMIT 1').fetchone()[0]);self.assertEqual(audit['friday'],r['fields']['friday']);self.assertEqual(audit['saturday'],r['fields']['saturday'])

if __name__=='__main__':unittest.main()
