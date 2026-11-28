"""Extra comparison coverage; all exports and data are synthetic."""
import copy
import hashlib
import json
import unittest

from crew_import_verify_test import inputs, m, uid


class VerifyBoundaryTests(unittest.TestCase):
    def rejected(self, args):
        with self.assertRaises(ValueError) as raised:
            m.verify_import(*args)
        self.assertEqual(str(raised.exception), 'CREW_IMPORT_VERIFY_FAILED')
        self.assertIsNone(raised.exception.__cause__)
        self.assertTrue(raised.exception.__suppress_context__)

    def test_all_optional_inputs_missing_keeps_all_seven_gates(self):
        args = inputs()
        result = m.verify_import(*args[:2])
        self.assertFalse(result['comparisonMatches'])
        self.assertEqual(len(result['blockers']), 7)
        self.assertEqual(result['findings'], [])

    def test_bad_json_values_and_goals_fail_even_without_other_artifacts(self):
        for change in (
            lambda t: t.update(extra=float('nan')),
            lambda t: t.update(extra=float('inf')),
            lambda t: t.update(extra={'private-key': object()}),
            lambda t: t.update(extra={123: 'not a JSON key'}),
            lambda t: t.update(extra='\ud800'),
            lambda t: t['categories'][0].update(required_count=True),
            lambda t: t['categories'][0].update(required_count=1.0),
            lambda t: t['categories'][0].update(required_count=10001),
            lambda t: t['categories'][0].update(required_term='x' * 1001),
            lambda t: t['sourceLinks'][0].update(source_history_id=123),
        ):
            args = inputs()
            args[2] = args[4] = args[5] = None
            change(args[3])
            self.rejected(args)

    def test_cycles_and_deep_extras_fail_without_recursion_or_value_leaks(self):
        args = inputs()
        args[3]['extra'] = args[3]
        self.rejected(args)
        args = inputs()
        nested = 'PRIVATE SYNTHETIC'
        for _ in range(1500):
            nested = [nested]
        args[3]['extra'] = nested
        self.rejected(args)

    def test_unknown_kept_row_values_preserve_exact_types_and_presence(self):
        for old, new in ((False, 0), (1, 1.0), ({'x': None}, {})):
            args = inputs(True)
            for idx in (2, 3):
                args[idx]['entries'][0]['unknown'] = copy.deepcopy(old)
            self.assertTrue(m.verify_import(*args)['comparisonMatches'])
            args[3]['entries'][0]['unknown'] = new
            result = m.verify_import(*args)
            self.assertFalse(result['comparisonMatches'])
            self.assertIn('unmapped.entries', next(f for f in result['findings'] if f['scope'] == 'target')['fields'])

    def test_unrelated_category_compensation_and_roster_changes_are_not_ignored(self):
        for changed in ('categories', 'entries', 'compensation'):
            args = inputs()
            category = dict(args[3]['categories'][0], id=uid(201), name='Unrelated')
            roster = dict(args[3]['entries'][0], id=uid(301), category_id=uid(201))
            compensation = dict(args[3]['compensation'][0], roster_id=uid(301))
            for idx in (2, 3):
                args[idx]['categories'].append(copy.deepcopy(category))
                args[idx]['entries'].append(copy.deepcopy(roster))
                args[idx]['compensation'].append(copy.deepcopy(compensation))
            self.assertTrue(m.verify_import(*args)['comparisonMatches'])
            field = {'categories': 'required_count', 'entries': 'notes', 'compensation': 'agreed'}[changed]
            args[3][changed][-1][field] = 1 if changed != 'entries' else 'PRIVATE'
            result = m.verify_import(*args)
            self.assertFalse(result['comparisonMatches'])
            self.assertNotIn('PRIVATE', json.dumps(result))

    def test_extra_package_and_changed_previous_links_are_findings(self):
        args = inputs()
        args[3]['sourcePackages'].append({'id': uid(401), 'edition_id': uid(100), 'source_sha256': 'd' * 64})
        result = m.verify_import(*args)
        self.assertFalse(result['comparisonMatches'])
        self.assertIn('IMPORT_DIFFERENCES_PRESENT', result['blockers'])
        args = inputs(True)
        package = {'id': uid(401), 'edition_id': uid(100), 'source_sha256': 'd' * 64}
        link = {'package_id': uid(401), 'edition_id': uid(100), 'source_row_id': 'old',
                'roster_id': uid(300), 'source_history_id': None, 'extra': False}
        for idx in (2, 3):
            args[idx]['sourcePackages'].append(copy.deepcopy(package))
            args[idx]['sourceLinks'].append(copy.deepcopy(link))
        self.assertTrue(m.verify_import(*args)['comparisonMatches'])
        args[3]['sourceLinks'][-1]['extra'] = 0
        result = m.verify_import(*args)
        self.assertIn('previous_links', next(f for f in result['findings'] if f['scope'] == 'provenance')['fields'])

    def test_reordered_export_rows_and_keys_do_not_create_differences(self):
        args = inputs(True)
        args[2]['categories'][0]['extra'] = {'one': 1, 'two': 2}
        args[3]['categories'][0]['extra'] = {'two': 2, 'one': 1}
        args[3] = dict(reversed(list(args[3].items())))
        for key in ('categories', 'entries', 'compensation', 'sourcePackages', 'sourceLinks'):
            args[3][key].reverse()
        self.assertTrue(m.verify_import(*args)['comparisonMatches'])

    def test_target_fingerprint_drift_and_overrange_keep_invalidate_before_plan(self):
        for change in (
            lambda t: t.update(targetFingerprint='d' * 64),
            lambda t: t['entries'][0].update(version=2147483648),
        ):
            args = inputs(True)
            change(args[2])
            result = m.verify_import(*args)
            self.assertIn('BEFORE_PLAN_MISMATCH', result['blockers'])
            self.assertEqual(result['findings'], [{'scope': 'target', 'id': 'snapshot', 'fields': ['approved_plan']}])

    def test_nullable_history_link_is_explicitly_preserved(self):
        args = inputs()
        tables = json.loads(args[0])
        next(t for t in tables if t['name'] == 'working')['rows'][0][4] = None
        args[0] = json.dumps(tables).encode()
        args[5] = args[0].decode()
        source_hash = hashlib.sha256(args[0]).hexdigest()
        plan = json.loads(args[1])
        plan['sourceSha256'] = source_hash
        args[1] = json.dumps(plan)
        args[4].update(sourceSha256=source_hash, planSha256=hashlib.sha256(args[1].encode()).hexdigest())
        args[3]['sourcePackages'][0]['source_sha256'] = source_hash
        args[3]['sourceLinks'][0]['source_history_id'] = None
        self.assertTrue(m.verify_import(*args)['comparisonMatches'])


if __name__ == '__main__':
    unittest.main()
