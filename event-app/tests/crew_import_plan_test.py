"""Pure plan preparation: synthetic sources only, no target writes."""
import copy, hashlib, importlib, json, sys, unittest
from pathlib import Path
from crew_transfer_reconcile_test import setup, uid
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
try: m=importlib.import_module('crew_import_plan')
finally: sys.path.pop(0)
def inputs(create=False):
 raw,flat,target=setup();target['targetFingerprint']='a'*64
 mapping={'editionId':flat['editionId'],'categories':{'cat1':{'id':uid(200),'action':'keep'}},'entries':{'w1':{'id':uid(300),'action':'keep','compensationAction':'keep'}}}
 if create:
  target['categories']=[];target['entries']=[];target['compensation']=[]
  mapping['categories']['cat1']['action']='create';mapping['entries']['w1'].update(action='create',compensationAction='create',kind='unresolved')
 return raw,mapping,target
class ImportPlanTests(unittest.TestCase):
 def rejected(self,*args):
  with self.assertRaisesRegex(ValueError,'^CREW_IMPORT_PLAN_FAILED$'):m.build_import_plan(*args)
 def test_unavailable_inputs_never_create_plan_or_ids(self):
  raw,_,_=inputs();out=m.build_import_plan(raw);self.assertIsNone(out['planText']);self.assertFalse(out['applyReady']);self.assertIn('MAPPING_REQUIRED',out['blockers']);self.assertIn('TARGET_EXPORT_REQUIRED',out['blockers'])
 def test_create_and_keep_produce_hashed_plan_with_three_manual_gates(self):
  for create in [True,False]:
   raw,mp,t=inputs(create);before=copy.deepcopy((mp,t));o=m.build_import_plan(raw,mp,t);p=json.loads(o['planText']);self.assertEqual(o['planSha256'],hashlib.sha256(o['planText'].encode()).hexdigest());self.assertEqual(p['targetFingerprint'],'a'*64);self.assertEqual(len(o['blockers']),3);self.assertFalse(o['applyReady']);self.assertEqual((mp,t),before);self.assertEqual(p['entries'][0]['expectedVersion'],0 if create else 5)
   for private in ['qa@example.invalid','Synthetic duplicate name','estimate','agreed','Public operational note']:self.assertNotIn(private,o['planText'])
 def test_missing_mapping_cannot_skip_a_source_row(self):
  raw,mp,t=inputs();mp['entries']={};o=m.build_import_plan(raw,mp,t);self.assertIsNone(o['planText']);self.assertIn('MAPPING_REQUIRED',o['blockers'])
 def test_target_unavailable_invalid_or_wrong_edition_fails_closed(self):
  raw,mp,t=inputs();self.assertIsNone(m.build_import_plan(raw,mp,None)['planText']);t['complete']=False;self.rejected(raw,mp,t);t['complete']=True;mp['editionId']=uid(999);self.rejected(raw,mp,t)
 def test_archived_missing_provenance_or_fingerprint_blocks_plan(self):
  for key in ['archived','provenanceReady','targetFingerprint']:
   raw,mp,t=inputs()
   if key=='archived':t['edition'][key]=True
   else:t[key]=False if key=='provenanceReady' else 'a'*64+'\n'
   self.assertIsNone(m.build_import_plan(raw,mp,t)['planText'])
 def test_existing_source_blocks_even_with_different_explicit_mapping(self):
  raw,mp,t=inputs();t['sourcePackages']=[{'id':uid(400),'edition_id':uid(100),'source_sha256':hashlib.sha256(raw).hexdigest()}];t['sourceLinks']=[{'package_id':uid(400),'edition_id':uid(100),'source_row_id':'w1','roster_id':uid(300)}];mp['entries']['w1']['id']=uid(301);o=m.build_import_plan(raw,mp,t);self.assertIn('SOURCE_ALREADY_PRESENT_REVIEW_REQUIRED',o['blockers']);self.assertIsNone(o['planText'])
 def test_money_null_is_not_zero_and_keep_never_overwrites(self):
  raw,mp,t=inputs();t['compensation'][0]['estimate']=0;o=m.build_import_plan(raw,mp,t);self.assertIn('TARGET_CONFLICTS',o['blockers']);self.assertIsNone(o['planText'])
 def test_create_collisions_include_same_category_name_under_another_id(self):
  raw,mp,t=inputs();mp['categories']['cat1'].update(id=uid(201),action='create');self.assertIsNone(m.build_import_plan(raw,mp,t)['planText'])
 def test_keep_identity_is_preserved_without_creating_people_or_accounts(self):
  raw,mp,t=inputs();t['entries'][0].update(kind='person',person_id=uid(900),linked_user_id=uid(901));p=json.loads(m.build_import_plan(raw,mp,t)['planText']);self.assertEqual(p['entries'][0]['personId'],uid(900));self.assertEqual(p['entries'][0]['linkedUserId'],uid(901));self.assertNotIn('required_count',p['categories'][0])
 def test_kept_roster_can_explicitly_create_missing_compensation(self):
  raw,mp,t=inputs();t['compensation']=[];mp['entries']['w1']['compensationAction']='create';p=json.loads(m.build_import_plan(raw,mp,t)['planText']);self.assertEqual(p['entries'][0]['expectedCompensationVersion'],0)
 def test_unknown_keys_new_person_invalid_uuid_and_extra_mapping_are_rejected(self):
  for change in [lambda mp:mp.update(extra=True),lambda mp:mp['entries']['w1'].update(kind='person'),lambda mp:mp['categories']['cat1'].update(id=uid(200)+'\n'),lambda mp:mp['entries'].update(unknown={'id':uid(301),'action':'keep','compensationAction':'keep'})]:
   raw,mp,t=inputs();change(mp);self.rejected(raw,mp,t)
 def test_create_requires_explicit_unresolved_or_group_kind(self):
  raw,mp,t=inputs(True);mp['entries']['w1'].pop('kind');self.rejected(raw,mp,t)
 def test_invalid_source_error_contains_no_payload(self):self.rejected(b'PRIVATE broken source')
 def test_invalid_large_target_version_does_not_emit_unusable_sql_plan(self):
  raw,mp,t=inputs();t['entries'][0]['version']=2147483648;self.rejected(raw,mp,t)
