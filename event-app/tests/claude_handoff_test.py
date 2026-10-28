"""Synthetic host safety tests; no Claude, credentials, network or production data."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec=importlib.util.spec_from_file_location('handoff',Path(__file__).parents[1]/'tools/claude_handoff.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)

class ScopeTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name).resolve()
    def tearDown(self):self.tmp.cleanup()
    def test_private_paths_and_traversal(self):
        for name in ['.local/data.json','event-app/public/data.json','event-app/src/../../private.json',
                     'event-app/src/.env.local','/tmp/a.py','event-app/src/a\\b.py','event-app/src/a//b.py',
                     'event-app/tools/backup.sqlite3','event-app-zadani/source.xlsx','other/app.py']:
            with self.subTest(name=name),self.assertRaises(h.Rejected):h.safe_path(self.root,name)
    def test_source_and_explicit_ddl(self):
        for name in ['event-app/src/app/page.tsx','event-app/tests/fake.test.ts','event-app/tools/check.py']:
            self.assertEqual(h.safe_path(self.root,name),self.root/name)
        name='event-app/supabase/migrations/202609280001_partners.sql'
        with self.assertRaises(h.Rejected):h.safe_path(self.root,name)
        self.assertEqual(h.safe_path(self.root,name,True),self.root/name)
        with self.assertRaises(h.Rejected):h.safe_path(self.root,'event-app/database-dump.sql',True)
    def test_symlink_cannot_escape(self):
        (self.root/'event-app').mkdir();(self.root/'event-app/src').symlink_to('/tmp',target_is_directory=True)
        with self.assertRaises(h.Rejected):h.safe_path(self.root,'event-app/src/a.py')
    def test_main_workspace_rejected(self):
        with patch.object(h,'ANCHOR',self.root),self.assertRaises(h.Rejected):h.verify_tree(self.root,'a'*40)
    def test_worktree_lock_excludes_second_writer(self):
        with h.tree_lock(self.root):
            with self.assertRaises(h.Rejected):
                with h.tree_lock(self.root):pass
    def test_blob_context_not_working_content(self):
        target=self.root/'event-app/src/a.ts';target.parent.mkdir(parents=True);target.write_text('local value')
        with patch.object(h,'command',side_effect=['event-app/src/a.ts','tracked synthetic value']) as run:
            prompt=h.build_prompt(self.root,{'number':1},['event-app/src/a.ts'],[],[])
        self.assertIn('tracked synthetic value',prompt);self.assertNotIn('local value',prompt)
        self.assertEqual(run.call_args_list[1].args[0],['git','show','HEAD:event-app/src/a.ts'])
    def test_untracked_source_rejected(self):
        target=self.root/'event-app/src/a.ts';target.parent.mkdir(parents=True);target.write_text('synthetic')
        with patch.object(h,'command',side_effect=h.Rejected('untracked')),self.assertRaises(h.Rejected):
            h.build_prompt(self.root,{},['event-app/src/a.ts'],[],[])
    def test_all_output_paths_validated_before_write(self):
        with self.assertRaises(h.Rejected):h.apply_files(self.root,[{'path':'event-app/tools/ok.py','content':'ok'}, {'path':'.local/no.py','content':'no'}])
        self.assertFalse((self.root/'event-app').exists())
    def test_apply_only_selected_file(self):
        h.apply_files(self.root,[{'path':'event-app/tools/ok.py','content':'synthetic\n'}])
        self.assertEqual((self.root/'event-app/tools/ok.py').read_text(),'synthetic\n')

class ReplyTests(unittest.TestCase):
    def reply(self,**changes):
        data={'status':'completed','summary':'Synthetic','questions':[], 'files':[{'path':'event-app/tools/a.py','content':'pass\n'}]}
        data.update(changes);return json.dumps({'subtype':'success','structured_output':data})
    def test_valid_reply(self):self.assertEqual(h.parse_reply(self.reply(),['event-app/tools/a.py'])['status'],'completed')
    def test_unexpected_or_duplicate_path(self):
        for files in [[{'path':'event-app/tools/b.py','content':''}],[{'path':'event-app/tools/a.py','content':''}]*2]:
            with self.assertRaises(h.Rejected):h.parse_reply(self.reply(files=files),['event-app/tools/a.py'])
    def test_blocked_cannot_write(self):
        with self.assertRaises(h.Rejected):h.parse_reply(self.reply(status='blocked'),['event-app/tools/a.py'])
    def test_unresolved_questions_cannot_apply(self):
        with self.assertRaises(h.Rejected):h.parse_reply(self.reply(questions=['Missing context']),['event-app/tools/a.py'])
    def test_duplicate_json_key_and_nan_rejected(self):
        for raw in ['{"a":1,"a":2}','{"x":NaN}']:
            with self.assertRaises(h.Rejected):h.decode(raw)
    def test_provider_failure_rejected(self):
        with self.assertRaises(h.Rejected):h.parse_reply('{"is_error":true}',[])

class HostGateTests(unittest.TestCase):
    def test_api_credentials_not_inherited(self):
        with patch.dict(h.os.environ,{'ANTHROPIC_API_KEY':'synthetic','CLAUDE_CODE_OAUTH_TOKEN':'synthetic','DATABASE_URL':'synthetic'}):
            self.assertFalse({'ANTHROPIC_API_KEY','CLAUDE_CODE_OAUTH_TOKEN','DATABASE_URL'}&h.native_env().keys())
    def test_changed_remote_pr_head_rejected(self):
        sha='a'*40
        responses=[{'login':h.ACTOR},{'full_name':h.REPO,'permissions':{'push':True}},
                   {'user':{'login':h.ACTOR},'state':'open','title':'Synthetic','body':h.MARKER},
                   {'state':'open','head':{'sha':'b'*40,'ref':'codex/test','repo':{'full_name':h.REPO}},'base':{'repo':{'full_name':h.REPO}}},
                   {'user':{'login':h.ACTOR},'submitted_at':'2026-01-01T00:00:00Z','commit_id':sha,'state':'COMMENTED'}]
        with patch.object(h,'command',side_effect=[json.dumps(r) for r in responses]),self.assertRaises(h.Rejected):
            h.github_task(1,'2:3',sha,'codex/test')
    def test_unknown_capacity_never_calls_model(self):
        class UsageError(Exception):pass
        @h.contextlib.contextmanager
        def blocked():raise UsageError('CLAUDE_USAGE_UNAVAILABLE');yield
        guard=SimpleNamespace(session=blocked,UsageError=UsageError)
        args=SimpleNamespace(worktree='/private/tmp/synthetic-svdt',expected_head='a'*40,
                             allow=['event-app/tools/a.py'],context=[],context_ddl=[],issue=1,review=None,dry_run=False,timeout=30)
        auth=SimpleNamespace(stdout=json.dumps({'loggedIn':True,'authMethod':'claude.ai','subscriptionType':'pro'}))
        with patch.object(h,'verify_tree'),patch.object(h,'github_task',return_value={}),patch.object(h,'build_prompt',return_value='synthetic'),patch.object(h,'command',return_value='codex/test'),patch.object(h,'usage_guard',return_value=guard),patch.object(h.subprocess,'run',return_value=auth),patch.object(h.subprocess,'Popen') as model:
            with self.assertRaises(h.Rejected):h.run(args)
            model.assert_not_called()

if __name__=='__main__':unittest.main()
