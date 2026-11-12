"""Independent synthetic checks. No live project, source roster or import."""
import copy,hashlib,importlib,json,sys,unittest
from pathlib import Path
from crew_transfer_reconcile_test import setup,uid
from crew_import_preview_test import fixture,encode,table
sys.path.insert(0,str(Path(__file__).parents[1]/'tools'))
try:
 m=importlib.import_module('crew_import_verify')
 builder=importlib.import_module('crew_import_plan')
 preview=importlib.import_module('crew_import_preview')
finally:sys.path.pop(0)

def inputs(keep=False,person=False,comp_create=False):
 raw,flat,before=setup();before['targetFingerprint']='a'*64
 mapping={'editionId':uid(100),'categories':{'cat1':{'id':uid(200),'action':'keep' if keep else 'create'}},'entries':{'w1':{'id':uid(300),'action':'keep' if keep else 'create','compensationAction':'create' if comp_create or not keep else 'keep'}}}
 if not keep:
  before['categories']=[];before['entries']=[];before['compensation']=[];mapping['entries']['w1']['kind']='group'
 if person:before['entries'][0].update(kind='person',person_id=uid(900),linked_user_id=uid(901))
 if comp_create:before['compensation']=[]
 plan=builder.build_import_plan(raw,mapping,before)['planText'];assert plan
 p=json.loads(plan);s=preview.build_preview(raw);after=copy.deepcopy(before);after['targetFingerprint']='c'*64;after['capturedAt']='2026-11-12T00:00:00Z'
 if not keep:
  after['categories']=[{'id':uid(200),'edition_id':uid(100),'name':s['categories'][0]['name'],'color':s['categories'][0]['color'],'required_count':None,'required_term':'','version':1}]
  after['entries']=[{'id':uid(300),'edition_id':uid(100),'category_id':uid(200),**s['entries'][0]['roster'],'kind':'group','version':1}]
 if not keep or comp_create:after['compensation']=[{'roster_id':uid(300),'edition_id':uid(100),**s['entries'][0]['compensation'],'version':1}]
 after['sourcePackages']=[{'id':uid(400),'edition_id':uid(100),'source_sha256':hashlib.sha256(raw).hexdigest(),'source_format':'crew-tables-v1','actor_id':uid(1),'created_at':'fixed'}]
 after['sourceLinks']=[{'package_id':uid(400),'edition_id':uid(100),'source_row_id':'w1','roster_id':uid(300),'source_history_id':'h1','actor_id':uid(1),'created_at':'fixed'}]
 receipt={'version':1,'editionId':uid(100),'approvalId':uid(700),'requestId':uid(701),'packageId':uid(400),'sourceSha256':hashlib.sha256(raw).hexdigest(),'planSha256':hashlib.sha256(plan.encode()).hexdigest(),'createdCategories':0 if keep else 1,'keptCategories':1 if keep else 0,'createdEntries':0 if keep else 1,'keptEntries':1 if keep else 0,'createdCompensations':1 if not keep or comp_create else 0,'keptCompensations':1 if keep and not comp_create else 0,'sourceRows':1}
 return [raw,plan,before,after,receipt,raw.decode()]

class VerifyTests(unittest.TestCase):
 def rejected(self,args):
  with self.assertRaisesRegex(ValueError,'^CREW_IMPORT_VERIFY_FAILED$'):m.verify_import(*args)
 def failed(self,args,code=None):
  out=m.verify_import(*args);self.assertFalse(out['comparisonMatches']);self.assertFalse(out['cutoverReady']);self.assertFalse(out['applyReady'])
  if code:self.assertIn(code,out['blockers'])
  return out
 def test_group_create_matches_approved_identity_without_authorizing_cutover(self):
  args=inputs();before=copy.deepcopy(args);o=m.verify_import(*args);self.assertTrue(o['comparisonMatches']);self.assertEqual(o['mode'],'post_import_verification');self.assertFalse(o['authorityVerified']);self.assertFalse(o['cutoverReady']);self.assertFalse(o['applyReady']);self.assertEqual(o['findings'],[]);self.assertEqual(len(o['blockers']),3);self.assertEqual(args,before)
 def test_exact_keep_preserves_person_account_goals_and_versions(self):
  args=inputs(True,True);self.assertTrue(m.verify_import(*args)['comparisonMatches']);self.assertEqual(args[3]['categories'][0]['required_count'],123)
 def test_keep_can_add_only_explicitly_missing_compensation(self):self.assertTrue(m.verify_import(*inputs(True,False,True))['comparisonMatches'])
 def test_each_missing_input_is_explicit_and_cannot_match(self):
  for index,code in [(2,'BEFORE_EXPORT_REQUIRED'),(3,'AFTER_EXPORT_REQUIRED'),(4,'IMPORT_RECEIPT_REQUIRED'),(5,'SOURCE_PAYLOAD_READBACK_REQUIRED')]:
   args=inputs();args[index]=None;self.failed(args,code)
 def test_duplicate_plan_keys_and_noninteger_or_unknown_plan_fields_fail_closed(self):
  for change in [lambda p:p.replace('{','{"version":1,',1),lambda p:p.replace('"version":1','"version":true',1),lambda p:p.replace('"version":1','"version":1.0',1),lambda p:p.replace('"expectedVersion":0','"expectedVersion":0.0'),lambda p:p[:-1]+',"extra":true}']:
   args=inputs();args[1]=change(args[1]);self.rejected(args)
 def test_incomplete_coverage_unknown_sources_and_duplicate_targets_are_rejected(self):
  for change in [lambda p:p.update(entries=[]),lambda p:p['entries'][0].update(sourceRowId='missing'),lambda p:p['entries'].append(copy.deepcopy(p['entries'][0]))]:
   args=inputs();p=json.loads(args[1]);change(p);args[1]=json.dumps(p);self.rejected(args)
 def test_money_null_zero_barter_merch_and_identity_drift_are_findings(self):
  for name,key,value in [('compensation','estimate',0),('compensation','agreed',None),('compensation','barter','PRIVATE BARTER'),('compensation','merch','PRIVATE MERCH'),('entries','kind','unresolved'),('entries','phone','PRIVATE PHONE'),('entries','friday','10–12'),('entries','version',2)]:
   args=inputs();args[3][name][0][key]=value;o=self.failed(args,'IMPORT_DIFFERENCES_PRESENT');self.assertTrue(any(key in x['fields'] for x in o['findings']));self.assertNotIn('PRIVATE',json.dumps(o))
 def test_unapproved_existing_identity_change_is_detected(self):
  args=inputs(True,True);args[3]['entries'][0]['linked_user_id']=uid(902);o=self.failed(args,'IMPORT_DIFFERENCES_PRESENT');self.assertTrue(o['findings'])
 def test_goals_are_preserved_for_keep_and_empty_for_create(self):
  for keep,key,value in [(True,'required_count',124),(True,'required_term','Changed goal'),(False,'required_count',0),(False,'required_term','Changed goal')]:
   args=inputs(keep);args[3]['categories'][0][key]=value;self.failed(args,'IMPORT_DIFFERENCES_PRESENT')
 def test_malformed_partial_or_foreign_exports_never_look_like_empty_target(self):
  for idx in [2,3]:
   for change in [lambda t:t.update(complete=False),lambda t:t.update(canReadCompensation=False),lambda t:t['edition'].update(id=uid(999)),lambda t:t['categories'].append(copy.deepcopy(t['categories'][0]))]:
    args=inputs(True);change(args[idx]);self.rejected(args)
 def test_missing_nullable_goals_history_reference_and_invalid_fingerprints_are_rejected(self):
  for change in [lambda t:t['categories'][0].pop('required_count'),lambda t:t['categories'][0].pop('required_term'),lambda t:t['sourceLinks'][0].pop('source_history_id'),lambda t:t.update(targetFingerprint='a'*64+'\n')]:
   args=inputs();change(args[3]);self.rejected(args)
 def test_source_bytes_and_plan_hash_are_exact_not_reformatted(self):
  args=inputs();args[5]+='\n';self.failed(args,'SOURCE_PAYLOAD_MISMATCH')
  args=inputs();args[1]=' \n'+args[1];self.failed(args,'RECEIPT_MISMATCH');args[4]['planSha256']=hashlib.sha256(args[1].encode()).hexdigest();self.assertTrue(m.verify_import(*args)['comparisonMatches'])
 def test_receipt_counts_hashes_and_package_id_must_agree(self):
  for key,value in [('sourceRows',0),('createdEntries',0),('keptEntries',1),('planSha256','d'*64),('sourceSha256','d'*64),('editionId',uid(999)),('packageId',uid(999))]:
   args=inputs();args[4][key]=value;self.failed(args)
 def test_malformed_receipt_types_never_pass_as_zero_or_one(self):
  for key,value in [('version',True),('sourceRows',True),('createdEntries',1.0),('approvalId',uid(0)),('requestId',uid(701)+'\n')]:
   args=inputs();args[4][key]=value;self.rejected(args)
  args=inputs();args[4]['extra']=True;self.rejected(args)
 def test_source_link_coverage_history_id_and_target_mapping_are_checked(self):
  for change in [lambda t:t.update(sourceLinks=[]),lambda t:t['sourceLinks'][0].update(source_history_id='h2')]:
   args=inputs();change(args[3]);self.failed(args,'IMPORT_DIFFERENCES_PRESENT')
 def test_unmapped_rows_and_preexisting_packages_cannot_disappear_or_change(self):
  args=inputs(True);extra={**args[2]['entries'][0],'id':uid(301),'name':'PRIVATE EXTRA'}
  for idx in [2,3]:args[idx]['entries'].append(copy.deepcopy(extra))
  self.assertTrue(m.verify_import(*args)['comparisonMatches']);args[3]['entries'][1]['notes']='PRIVATE CHANGED';o=self.failed(args,'IMPORT_DIFFERENCES_PRESENT');self.assertNotIn('PRIVATE',json.dumps(o))
 def test_unexpected_extra_rows_are_not_ignored(self):
  args=inputs();args[3]['entries'].append({**args[3]['entries'][0],'id':uid(301)});self.failed(args,'IMPORT_DIFFERENCES_PRESENT')
 def test_before_snapshot_drift_invalidates_approved_plan(self):
  args=inputs(True);args[2]['entries'][0]['version']=6;self.failed(args,'BEFORE_PLAN_MISMATCH')
 def test_malformed_source_is_rewrapped_without_content(self):self.rejected([b'PRIVATE invalid','{}'])
 def test_archived_or_unavailable_provenance_exports_do_not_match(self):
  for idx in [2,3]:
   for key in ['archived','provenanceReady']:
    args=inputs()
    if key=='archived':args[idx]['edition'][key]=True
    else:args[idx][key]=False
    self.failed(args,'TARGET_ARCHIVED' if key=='archived' else 'PRIVATE_PROVENANCE_SCHEMA_REQUIRED')
 def test_report_is_deterministic_and_does_not_echo_private_values(self):
  args=inputs();args[3]['entries'][0].update(name='PRIVATE NAME',email='PRIVATE EMAIL',notes='PRIVATE NOTE');a=m.verify_import(*args);b=m.verify_import(*args);self.assertEqual(a,b);text=json.dumps(a);self.assertNotIn('PRIVATE',text);self.assertNotIn('qa@example.invalid',text);self.assertNotIn('planText',a);self.assertNotIn('source_text',a)
 def test_prior_source_packages_and_links_are_preserved_exactly(self):
  args=inputs(True)
  oldpkg={'id':uid(401),'edition_id':uid(100),'source_sha256':'d'*64,'actor_id':uid(1),'created_at':'old'}
  oldlink={'package_id':uid(401),'edition_id':uid(100),'source_row_id':'old-row','roster_id':uid(300),'source_history_id':None,'actor_id':uid(1),'created_at':'old'}
  for idx in [2,3]:args[idx]['sourcePackages'].append(copy.deepcopy(oldpkg));args[idx]['sourceLinks'].append(copy.deepcopy(oldlink))
  self.assertTrue(m.verify_import(*args)['comparisonMatches']);args[3]['sourcePackages'][1]['created_at']='changed';self.failed(args,'IMPORT_DIFFERENCES_PRESENT')
 def test_missing_link_on_otherwise_valid_snapshot_is_not_success(self):
  args=inputs();args[3]['sourceLinks']=[];out=self.failed(args);self.assertTrue(out['findings'])
 def test_receipt_requires_exact_original_plan_bytes_even_when_json_semantics_match(self):
  args=inputs();args[1]=json.dumps(json.loads(args[1]),indent=2);self.failed(args,'RECEIPT_MISMATCH')
 def test_numeric_booleans_and_nil_target_identifiers_in_plan_are_rejected(self):
  for key,value in [('expectedVersion',False),('expectedCompensationVersion',False),('targetRosterId',uid(0))]:
   args=inputs();p=json.loads(args[1]);p['entries'][0][key]=value;args[1]=json.dumps(p);self.rejected(args)
 def test_missing_before_does_not_skip_validation_of_other_supplied_arguments(self):
  args=inputs();args[2]=None;args[4]['sourceRows']=True;self.rejected(args)
