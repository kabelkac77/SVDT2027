"""Synthetic import preview tests, never reads or writes a live roster."""
import copy,hashlib,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('preview',Path(__file__).parents[1]/'tools/crew_import_preview.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def fixture():
    fields={k:'' for k in ['name','categoryId','position','owner','email','phone','contactOriginal','statusNote','notes','barter','merch','term','friday','saturday']}
    fields.update(name='Synthetic duplicate name',categoryId='cat1',position='Desk',owner='QA',email='qa@example.invalid',status='candidate',archived=False,money={'estimate':None,'agreed':0,'total':12345,'paid':None},statusNote='Private source status',contactOriginal='Private original contact',notes='Public operational note',futureExtra={'x':[1,None]})
    history=json.dumps({'name':'Historical synthetic','raw':[{'label':'Cash','value':123}],'extra':'preserve'},ensure_ascii=False)
    return [{'name':'meta','columns':['key','value'],'rows':[['initialized','synthetic'],['source_hash','synthetic']]},
      {'name':'categories','columns':['id','name','name_key','color','sort_order','version'],'rows':[['cat1','Registrace','registrace','cat-0',0,1]]},
      {'name':'history','columns':['id','year','content'],'rows':[['h1','2026',history],['h2','2025',history]]},
      {'name':'working','columns':['id','year','category_id','content','source_id','version','updated_at'],'rows':[['w1','2027','cat1',json.dumps(fields,ensure_ascii=False),'h1',2,'fixed']]},
      {'name':'audit','columns':['id','at','kind','record_id','before_json','after_json'],'rows':[[1,'fixed','save','w1',None,json.dumps(fields)]]},
      {'name':'requests','columns':['id','fingerprint','response'],'rows':[['req1','fingerprint','response']]},
      {'name':'source_extra','columns':['blob','note'],'rows':[[{'type':'blob','base64':'AP8='},'original extra']] }]
def table(data,name):return next(t for t in data if t['name']==name)
def encode(data):return json.dumps(data,ensure_ascii=False).encode()
def change_fields(data,fn):
    row=table(data,'working')['rows'][0];fields=json.loads(row[3]);fn(fields);row[3]=json.dumps(fields,ensure_ascii=False)
class PreviewTests(unittest.TestCase):
    def rejected(self,value):
        with self.assertRaisesRegex(ValueError,'^CREW_IMPORT_PREVIEW_FAILED$'):m.build_preview(value)
    def test_preserves_exact_tables_provenance_and_non_importable_guards(self):
        data=fixture();raw=encode(data);before=copy.deepcopy(data);out=m.build_preview(raw)
        self.assertEqual(out['preservedTables'],before);self.assertEqual(out['sourceSha256'],hashlib.sha256(raw).hexdigest());self.assertEqual(out['mode'],'preview_only');self.assertFalse(out['applyReady']);self.assertEqual(out['version'],1)
        for gate in ['IDENTITY_MAPPING_REQUIRED','PRIVATE_PROVENANCE_SCHEMA_REQUIRED','TARGET_PROJECT_AND_EDITION_REQUIRED','ACCOUNT_SCOPES_REQUIRED','VERIFIED_BACKUP_AND_RESTORE_REQUIRED']:self.assertIn(gate,out['blockers'])
        self.assertEqual(data,before);self.assertNotIn('PRIVATE',json.dumps(out['warnings']))
    def test_roster_separates_private_unmapped_columns_and_preserves_null_zero(self):
        out=m.build_preview(encode(fixture()));entry=out['entries'][0];r=entry['roster'];c=entry['compensation']
        self.assertEqual(r['kind'],'unresolved');self.assertIsNone(r['person_id']);self.assertIsNone(r['linked_user_id']);self.assertEqual(r['notes'],'Public operational note');self.assertNotIn('statusNote',r);self.assertNotIn('contactOriginal',r)
        self.assertEqual(entry['unmapped']['statusNote'],'Private source status');self.assertEqual(entry['unmapped']['futureExtra'],{'x':[1,None]});self.assertIsNone(c['estimate']);self.assertEqual(c['agreed'],0);self.assertEqual(c['total'],12345);self.assertIsNone(c['paid'])
        self.assertEqual(entry['sourceRowId'],'w1');self.assertEqual(entry['sourceId'],'h1');self.assertEqual(entry['sourceVersion'],2)
    def test_duplicate_names_contacts_are_never_merged_or_assigned_an_auth_identity(self):
        data=fixture();row=copy.deepcopy(table(data,'working')['rows'][0]);row[0]='w2';table(data,'working')['rows'].append(row);out=m.build_preview(encode(data));self.assertEqual(len(out['entries']),2);self.assertEqual({e['sourceRowId'] for e in out['entries']},{'w1','w2'});self.assertTrue(all(e['roster']['linked_user_id'] is None for e in out['entries']))
    def test_old_optional_day_columns_are_empty_without_touching_original_content(self):
        data=fixture();change_fields(data,lambda f:(f.pop('friday'),f.pop('saturday')));out=m.build_preview(encode(data));self.assertEqual(out['entries'][0]['roster']['friday'],'');self.assertEqual(out['entries'][0]['roster']['saturday'],'');self.assertEqual(out['preservedTables'],data)
    def test_confirmed_requires_real_term_and_is_never_inferred_from_history(self):
        data=fixture();change_fields(data,lambda f:f.update(status='confirmed',term='  '));self.rejected(encode(data));change_fields(data,lambda f:f.update(term='  Friday  '));out=m.build_preview(encode(data));self.assertEqual(out['entries'][0]['roster']['term'],'  Friday  ')
    def test_broken_category_history_or_year_fails_closed(self):
        for idx,value in [(1,'2026'),(2,'missing'),(4,'missing')]:
            data=fixture();table(data,'working')['rows'][0][idx]=value;self.rejected(encode(data))
        data=fixture();table(data,'history')['rows'][0][1]='2025';self.rejected(encode(data));data=fixture();change_fields(data,lambda f:f.update(categoryId='other'));self.rejected(encode(data))
    def test_invalid_money_and_missing_status_never_become_zero_or_default(self):
        for value in [True,-1,1.5,'12',100000000000]:
            data=fixture();change_fields(data,lambda f:f['money'].update(agreed=value));self.rejected(encode(data))
        data=fixture();change_fields(data,lambda f:f.pop('status'));self.rejected(encode(data))
    def test_missing_tables_columns_and_row_width_are_rejected(self):
        data=fixture();data=[t for t in data if t['name']!='audit'];self.rejected(encode(data));data=fixture();table(data,'working')['rows'][0].append('extra');self.rejected(encode(data));data=fixture();table(data,'categories')['columns'][0]='wrong';self.rejected(encode(data))
    def test_duplicate_json_keys_and_nonfinite_numbers_are_rejected_at_both_levels(self):
        self.rejected(b'[{"name":"working","name":"other"}]');data=fixture();table(data,'working')['rows'][0][3]='{"status":"candidate","status":"confirmed"}';self.rejected(encode(data));self.rejected(b'[NaN]');data=fixture();change_fields(data,lambda f:f['money'].update(agreed=float('nan')));self.rejected(encode(data))
    def test_duplicate_local_ids_or_categories_are_never_silently_overwritten(self):
        for name in ['working','history','categories']:
            data=fixture();table(data,name)['rows'].append(copy.deepcopy(table(data,name)['rows'][0]));self.rejected(encode(data))
        data=fixture();data.append(copy.deepcopy(data[0]));self.rejected(encode(data))
    def test_text_limits_and_wrong_types_are_not_truncated(self):
        for key,value in [('name','x'*201),('email',42),('friday','x'*101),('archived',1),('status','unknown-state')]:
            data=fixture();change_fields(data,lambda f:f.update({key:value}));self.rejected(encode(data))
    def test_required_count_is_never_inferred_from_number_of_rows(self):
        out=m.build_preview(encode(fixture()));self.assertIsNone(out['categories'][0]['requiredCount']);self.assertEqual(out['categories'][0]['requiredTerm'],'')

    def test_text_years_are_preserved_and_unexpected_working_years_cannot_disappear(self):
        out=m.build_preview(encode(fixture()));self.assertEqual(len(out['entries']),1)
        for year in [2027,'2026',True,None]:
            data=fixture();table(data,'working')['rows'][0][1]=year;self.rejected(encode(data))
    def test_category_target_length_and_duplicate_auxiliary_keys_fail_before_import(self):
        data=fixture();table(data,'categories')['rows'][0][1]='x'*101;self.rejected(encode(data))
        for name in ['audit','requests','meta']:
            data=fixture();table(data,name)['rows'].append(copy.deepcopy(table(data,name)['rows'][0]));self.rejected(encode(data))
    def test_overflow_float_and_empty_target_name_cannot_make_an_invalid_preview(self):
        data=fixture();row=table(data,'working')['rows'][0];row[3]=row[3][:-1]+',"overflow":1e999}';self.rejected(encode(data))
        data=fixture();change_fields(data,lambda f:f.update(name='   '));self.rejected(encode(data))
