"""Synthetic target reconciliation, no network, credentials, or live data."""
import copy,importlib,sys,json,unittest
from pathlib import Path
from crew_import_preview_test import fixture,encode
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
try:m=importlib.import_module('crew_transfer_reconcile');preview=importlib.import_module('crew_import_preview')
finally:sys.path.pop(0)
def uid(n):return '00000000-0000-0000-0000-'+str(n).zfill(12)
def setup():
 raw=encode(fixture());p=preview.build_preview(raw);cat=p['categories'][0];entry=p['entries'][0];e=uid(100)
 mapping={'editionId':e,'categories':{cat['sourceCategoryId']:uid(200)},'entries':{entry['sourceRowId']:uid(300)}}
 target={'complete':True,'canReadCompensation':True,'capturedAt':'2026-11-05T00:00:00Z','edition':{'id':e,'year':2027,'archived':False},'provenanceReady':True,
 'categories':[{'id':uid(200),'edition_id':e,'name':cat['name'],'color':cat['color'],'version':1,'required_count':123,'required_term':'keep target goal'}],
 'entries':[{'id':uid(300),'edition_id':e,'category_id':uid(200),'version':5,**entry['roster']}],
 'compensation':[{'roster_id':uid(300),'edition_id':e,'version':2,**entry['compensation']}], 'sourcePackages':[],'sourceLinks':[]}
 return raw,mapping,target
class ReconcileTests(unittest.TestCase):
 def rejected(self,*args):
  with self.assertRaisesRegex(ValueError,'^CREW_RECONCILE_FAILED$'):m.reconcile_preview(*args)
 def test_unavailable_target_is_not_an_empty_database_and_keeps_all_activation_guards(self):
  raw,mapping,_=setup();r=m.reconcile_preview(raw);self.assertFalse(r['targetAvailable']);self.assertFalse(r['applyReady']);self.assertEqual(r['mode'],'reconciliation_only');self.assertEqual(r['counts']['sourceRows'],1);self.assertEqual(r['rows'][0]['status'],'unmapped')
  r=m.reconcile_preview(raw,mapping,None);self.assertEqual(r['rows'][0]['status'],'target_unavailable');self.assertEqual(r['counts']['unavailableRows'],1);self.assertEqual(r['targetOnlyRosterIds'],[])
  for gate in ['EXPLICIT_ACTIVATION_REQUIRED','IDENTITY_AND_ACCOUNT_REVIEW_REQUIRED','VERIFIED_BACKUP_AND_RESTORE_REQUIRED','TARGET_EXPORT_REQUIRED','PRIVATE_PROVENANCE_SCHEMA_REQUIRED']:self.assertIn(gate,r['blockers'])
 def test_matching_explicit_ids_do_not_grant_permission_or_change_target_category_goals(self):
  raw,mapping,target=setup();before=copy.deepcopy(target);r=m.reconcile_preview(raw,mapping,target);self.assertEqual(r['rows'][0]['status'],'matches');self.assertEqual(r['categories'][0]['status'],'matches');self.assertEqual(r['counts']['matchingRows'],1);self.assertFalse(r['applyReady']);self.assertNotIn('TARGET_DIFFERENCES_PRESENT',r['blockers']);self.assertNotIn('PRIVATE_PROVENANCE_SCHEMA_REQUIRED',r['blockers']);self.assertNotIn('MAPPING_REVIEW_REQUIRED',r['blockers']);self.assertEqual(target,before)
 def test_matching_names_or_contacts_never_create_an_implicit_association(self):
  raw,_,target=setup();r=m.reconcile_preview(raw,None,target);self.assertEqual(r['rows'][0]['status'],'unmapped');self.assertEqual(r['counts']['mappedRows'],0);self.assertEqual(r['targetOnlyRosterIds'],[uid(300)])
 def test_null_and_zero_differences_and_private_source_fields_are_not_normalized(self):
  raw,mapping,target=setup();target['compensation'][0]['estimate']=0;target['compensation'][0]['agreed']=None;target['entries'][0]['notes']='DIFFERENT PRIVATE NOTE';r=m.reconcile_preview(raw,mapping,target);self.assertEqual(r['rows'][0]['status'],'differs');self.assertEqual(r['rows'][0]['fields'],['compensation.agreed','compensation.estimate','roster.notes']);self.assertIn('TARGET_DIFFERENCES_PRESENT',r['blockers']);text=json.dumps(r);self.assertNotIn('DIFFERENT PRIVATE NOTE',text);self.assertNotIn('qa@example.invalid',text);self.assertNotIn('Synthetic duplicate name',text)
 def test_missing_target_rows_categories_mappings_and_compensation_have_distinct_states(self):
  raw,mapping,target=setup()
  for mode,wanted in [('entry','missing_target'),('category-mapping','missing_category_mapping'),('target-category','missing_target_category'),('compensation','missing_compensation')]:
   mm=copy.deepcopy(mapping);tt=copy.deepcopy(target)
   if mode=='entry':tt['entries']=[];tt['compensation']=[]
   elif mode=='category-mapping':mm['categories']={}
   elif mode=='target-category':mm['categories']['cat1']=uid(999)
   else:tt['compensation']=[]
   self.assertEqual(m.reconcile_preview(raw,mm,tt)['rows'][0]['status'],wanted)
 def test_partial_or_foreign_edition_exports_cannot_be_used_for_a_clean_diff(self):
  raw,mapping,target=setup()
  for field,value in [('complete',False),('canReadCompensation',False),('capturedAt','')]:
   tt=copy.deepcopy(target);tt[field]=value;self.rejected(raw,mapping,tt)
  for table in ['categories','entries','compensation']:
   tt=copy.deepcopy(target);tt[table][0]['edition_id']=uid(999);self.rejected(raw,mapping,tt)
  tt=copy.deepcopy(target);tt['edition']['year']=2026;self.rejected(raw,mapping,tt)
 def test_unknown_source_keys_duplicate_targets_and_noncanonical_uuids_are_rejected(self):
  raw,mapping,target=setup();mm=copy.deepcopy(mapping);mm['entries']['unknown']=uid(301);self.rejected(raw,mm,target)
  for value in ['not-a-uuid','  '+uid(300),uid(0),'ABCDEF00-0000-0000-0000-000000000001']:
   mm=copy.deepcopy(mapping);mm['entries']['w1']=value;self.rejected(raw,mm,target)
  data=fixture();data[3]['rows'].append(copy.deepcopy(data[3]['rows'][0]));data[3]['rows'][1][0]='w2';mm=copy.deepcopy(mapping);mm['entries']['w2']=uid(300);self.rejected(encode(data),mm,target)
 def test_duplicate_primary_ids_and_bad_references_are_not_hidden_by_dictionary_overwrites(self):
  raw,mapping,target=setup()
  for name in ['categories','entries','compensation']:
   tt=copy.deepcopy(target);tt[name].append(copy.deepcopy(tt[name][0]));self.rejected(raw,mapping,tt)
  tt=copy.deepcopy(target);tt['entries'][0]['category_id']=uid(999);self.rejected(raw,mapping,tt)
  tt=copy.deepcopy(target);tt['compensation'][0]['roster_id']=uid(999);self.rejected(raw,mapping,tt)
 def test_invalid_target_money_status_and_identity_types_are_fail_closed(self):
  raw,mapping,target=setup()
  for value in [True,-1,1.5,'0',100000000000]:
   tt=copy.deepcopy(target);tt['compensation'][0]['agreed']=value;self.rejected(raw,mapping,tt)
  for key,value in [('status','bad'),('archived',1),('version',True),('kind','person'),('person_id',uid(999))]:
   tt=copy.deepcopy(target);tt['entries'][0][key]=value;self.rejected(raw,mapping,tt)
 def test_existing_source_package_does_not_hide_later_target_drift(self):
  raw,mapping,target=setup();source=preview.build_preview(raw)['sourceSha256'];target['sourcePackages']=[{'id':uid(400),'edition_id':uid(100),'source_sha256':source}];target['sourceLinks']=[{'package_id':uid(400),'edition_id':uid(100),'source_row_id':'w1','roster_id':uid(300)}];target['entries'][0]['name']='PRIVATE TARGET DRIFT';r=m.reconcile_preview(raw,mapping,target);self.assertTrue(r['sourcePackageSeen']);self.assertEqual(r['rows'][0]['status'],'differs');self.assertIn('roster.name',r['rows'][0]['fields']);self.assertNotIn('PRIVATE TARGET DRIFT',json.dumps(r))
 def test_package_links_must_be_unambiguous_and_agree_with_supplied_mapping(self):
  raw,mapping,target=setup();source=preview.build_preview(raw)['sourceSha256'];target['sourcePackages']=[{'id':uid(400),'edition_id':uid(100),'source_sha256':source}];base={'package_id':uid(400),'edition_id':uid(100),'source_row_id':'w1','roster_id':uid(300)}
  for link in [{**base,'source_row_id':'missing'},{**base,'package_id':uid(999)},{**base,'roster_id':uid(999)}]:
   tt=copy.deepcopy(target);tt['sourceLinks']=[link];self.rejected(raw,mapping,tt)
  tt=copy.deepcopy(target);tt['sourceLinks']=[base,copy.deepcopy(base)];self.rejected(raw,mapping,tt)
  tt=copy.deepcopy(target);tt['entries'].append({**tt['entries'][0],'id':uid(301)});tt['sourceLinks']=[base];mm=copy.deepcopy(mapping);mm['entries']['w1']=uid(301);self.rejected(raw,mm,tt)
 def test_archive_and_unactivated_provenance_remain_explicit_even_on_matching_rows(self):
  raw,mapping,target=setup();target['edition']['archived']=True;target['provenanceReady']=False;r=m.reconcile_preview(raw,mapping,target);self.assertIn('TARGET_ARCHIVED',r['blockers']);self.assertIn('PRIVATE_PROVENANCE_SCHEMA_REQUIRED',r['blockers']);self.assertFalse(r['applyReady'])
 def test_source_validation_errors_are_rewrapped_without_private_details(self):
  self.rejected(b'PRIVATE INVALID JSON',None,None)
 def test_extra_target_roster_ids_are_reported_without_name_or_contact_disclosure(self):
  raw,mapping,target=setup();extra={**target['entries'][0],'id':uid(301),'name':'PRIVATE EXTRA'};target['entries'].append(extra);r=m.reconcile_preview(raw,mapping,target);self.assertEqual(r['targetOnlyRosterIds'],[uid(301)]);self.assertNotIn('PRIVATE EXTRA',json.dumps(r))

 def test_incomplete_nullable_fields_are_not_silently_treated_as_explicit_null(self):
  raw,mapping,target=setup()
  for name,field in [('compensation','estimate'),('compensation','agreed'),('entries','person_id'),('entries','linked_user_id')]:
   tt=copy.deepcopy(target);tt[name][0].pop(field);self.rejected(raw,mapping,tt)
 def test_noninteger_year_and_invalid_category_state_cannot_look_like_a_complete_export(self):
  raw,mapping,target=setup();tt=copy.deepcopy(target);tt['edition']['year']=2027.0;self.rejected(raw,mapping,tt)
  for field,value in [('name','   '),('name','x'*101),('color','cat-99')]:
   tt=copy.deepcopy(target);tt['categories'][0][field]=value;self.rejected(raw,mapping,tt)
 def test_two_same_named_source_rows_remain_two_explicitly_mapped_records(self):
  raw,mapping,target=setup();data=fixture();table=data[3];table['rows'].append(copy.deepcopy(table['rows'][0]));table['rows'][1][0]='w2';mapping['entries']['w2']=uid(301);target['entries'].append({**target['entries'][0],'id':uid(301)});target['compensation'].append({**target['compensation'][0],'roster_id':uid(301)});r=m.reconcile_preview(encode(data),mapping,target);self.assertEqual(r['counts']['sourceRows'],2);self.assertEqual(r['counts']['matchingRows'],2);self.assertEqual([x['sourceRowId'] for x in r['rows']],['w1','w2'])
