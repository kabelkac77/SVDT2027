"""Independent synthetic acceptance for the bounded plan reader, no live import."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

from crew_import_plan_test import inputs
from crew_import_preview_test import encode, fixture, table
from crew_transfer_reconcile_test import uid

sys.path.insert(0, str(Path(__file__).parents[1] / 'tools'))
try:
    from crew_import_plan import build_import_plan
    from crew_import_verify_plan import parse_import_plan
finally:
    sys.path.pop(0)


def prepared(create=True):
    raw, mapping, target = inputs(create)
    return raw, json.loads(build_import_plan(raw, mapping, target)['planText'])


class VerifyPlanTests(unittest.TestCase):
    def rejected(self, raw, text):
        with self.assertRaises(ValueError) as raised:
            parse_import_plan(raw, text)
        self.assertEqual(str(raised.exception), 'CREW_IMPORT_VERIFY_FAILED')
        self.assertIsNone(raised.exception.__cause__)
        self.assertTrue(raised.exception.__suppress_context__)

    def bad_change(self, mutate, create=True):
        raw, plan = prepared(create)
        mutate(plan)
        self.rejected(raw, json.dumps(plan))

    def test_builder_create_and_keep_round_trip_with_private_preview(self):
        for create in (True, False):
            raw, plan = prepared(create)
            original = copy.deepcopy(plan)
            text = ' \n' + json.dumps(plan, indent=2) + '\t'
            parsed, preview = parse_import_plan(raw, text)
            self.assertEqual(parsed, original)
            self.assertEqual(preview['sourceSha256'], hashlib.sha256(raw).hexdigest())
            self.assertIsNone(preview['entries'][0]['compensation']['estimate'])
            self.assertEqual(preview['entries'][0]['compensation']['agreed'], 0)
            self.assertEqual(plan, original)
            self.assertFalse(preview['applyReady'])

    def test_existing_person_identity_and_missing_compensation_are_preserved(self):
        raw, mapping, target = inputs(False)
        target['entries'][0].update(kind='person', person_id=uid(900), linked_user_id=uid(901))
        target['compensation'] = []
        mapping['entries']['w1']['compensationAction'] = 'create'
        text = build_import_plan(raw, mapping, target)['planText']
        plan, _ = parse_import_plan(raw, text)
        self.assertEqual(plan['entries'][0]['personId'], uid(900))
        self.assertEqual(plan['entries'][0]['linkedUserId'], uid(901))
        self.assertEqual(plan['entries'][0]['expectedCompensationVersion'], 0)

    def test_group_and_unresolved_new_identity_are_supported(self):
        for kind in ('group', 'unresolved'):
            raw, plan = prepared()
            plan['entries'][0]['kind'] = kind
            self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)

    def test_top_shapes_types_and_extra_keys_fail(self):
        raw, _ = prepared()
        for value in (None, [], True, 1, 'private synthetic@example.invalid'):
            self.rejected(raw, json.dumps(value))
        for key in prepared()[1]:
            self.bad_change(lambda p, k=key: p.pop(k))
        self.bad_change(lambda p: p.update(extra='synthetic secret'))
        for key in ('categories', 'entries'):
            for value in (None, {}, True, 1, 'string'):
                self.bad_change(lambda p, k=key, v=value: p.update({k: v}))

    def test_operation_shapes_and_extra_fields_fail(self):
        for key in ('categories', 'entries'):
            for value in (None, [], 1, True, 'string'):
                self.bad_change(lambda p, k=key, v=value: p[k].__setitem__(0, v))
            self.bad_change(lambda p, k=key: p[k][0].update(extra=True))
            for field in prepared()[1][key][0]:
                self.bad_change(lambda p, k=key, f=field: p[k][0].pop(f))

    def test_duplicate_json_keys_at_all_levels_fail(self):
        raw, plan = prepared()
        text = json.dumps(plan)
        self.rejected(raw, text.replace('"version": 1', '"version": 1, "version": 1', 1))
        for key in ('sourceCategoryId', 'sourceRowId'):
            value = 'cat1' if key == 'sourceCategoryId' else 'w1'
            fragment = json.dumps(key) + ': ' + json.dumps(value)
            self.rejected(raw, text.replace(fragment, fragment + ', ' + fragment, 1))

    def test_non_finite_json_and_deep_input_fail_privately(self):
        raw, plan = prepared()
        for spelling in ('NaN', 'Infinity', '-Infinity', '1e999'):
            self.rejected(raw, json.dumps(plan).replace('"version": 1', '"version": ' + spelling, 1))
        self.rejected(raw, '[' * 1500 + '0' + ']' * 1500)

    def test_only_exact_integer_version_and_expected_versions_pass(self):
        for value in (True, False, 1.0, 0, 2, '1', None):
            self.bad_change(lambda p, v=value: p.update(version=v))
        for key, field in (('categories', 'expectedVersion'), ('entries', 'expectedVersion'), ('entries', 'expectedCompensationVersion')):
            for value in (True, False, 0.0, -1, 2147483648, '0', None):
                self.bad_change(lambda p, k=key, f=field, v=value: p[k][0].update({f: v}))
        raw, plan = prepared(False)
        text = json.dumps(plan)
        self.rejected(raw, text.replace('"version": 1', '"version": 1e0', 1))
        self.rejected(raw, text.replace('"expectedVersion": 5', '"expectedVersion": 5e0', 1))
        for key, field in (('categories', 'expectedVersion'), ('entries', 'expectedVersion'), ('entries', 'expectedCompensationVersion')):
            raw, plan = prepared(False)
            plan[key][0][field] = 2147483647
            self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)

    def test_create_keep_versions_and_action_types_must_match(self):
        for key, action, version in (('categories', 'action', 'expectedVersion'), ('entries', 'action', 'expectedVersion'), ('entries', 'compensationAction', 'expectedCompensationVersion')):
            self.bad_change(lambda p, k=key, v=version: p[k][0].update({v: 1}))
            self.bad_change(lambda p, k=key, v=version: p[k][0].update({v: 0}), create=False)
            for bad in ('update', '', True, [], {}, None):
                self.bad_change(lambda p, k=key, a=action, b=bad: p[k][0].update({a: b}))

    def test_canonical_uuid_hash_and_exact_source_bytes_are_required(self):
        paths = ((None, 'editionId'), ('categories', 'targetCategoryId'), ('entries', 'targetRosterId'))
        for key, field in paths:
            for value in ('00000000-0000-0000-0000-000000000000', 'ABCDEFAB-0000-0000-0000-000000000001', uid(2) + '\n', '{' + uid(2) + '}', 2, None):
                self.bad_change(lambda p, k=key, f=field, v=value: (p if k is None else p[k][0]).update({f: v}))
        for field in ('sourceSha256', 'targetFingerprint'):
            for value in ('A' * 64, 'a' * 63, 'a' * 64 + '\n', None, 42):
                self.bad_change(lambda p, f=field, v=value: p.update({f: v}))
        raw, plan = prepared()
        self.rejected(raw + b' ', json.dumps(plan))
        plan['targetFingerprint'] = 'b' * 64
        self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)

    def test_source_coverage_duplicates_unknown_and_missing_fail(self):
        for key, field in (('categories', 'sourceCategoryId'), ('entries', 'sourceRowId')):
            self.bad_change(lambda p, k=key: p.update({k: []}))
            self.bad_change(lambda p, k=key: p[k].append(copy.deepcopy(p[k][0])))
            for value in ('unknown', '', None, 1, True, [], {}):
                self.bad_change(lambda p, k=key, f=field, v=value: p[k][0].update({f: v}))

    def test_two_rows_categories_order_and_target_id_uniqueness(self):
        data = fixture()
        cat = copy.deepcopy(table(data, 'categories')['rows'][0])
        cat[0:3] = ['cat2', 'VIP', 'vip']
        table(data, 'categories')['rows'].append(cat)
        row = copy.deepcopy(table(data, 'working')['rows'][0])
        row[0], row[2] = 'w2', 'cat2'
        fields = json.loads(row[3]); fields['categoryId'] = 'cat2'; row[3] = json.dumps(fields)
        table(data, 'working')['rows'].append(row)
        raw = encode(data)
        _, plan = prepared()
        plan['sourceSha256'] = hashlib.sha256(raw).hexdigest()
        plan['categories'].append(dict(plan['categories'][0], sourceCategoryId='cat2', targetCategoryId=uid(201)))
        plan['entries'].append(dict(plan['entries'][0], sourceRowId='w2', targetRosterId=uid(301)))
        plan['categories'].reverse(); plan['entries'].reverse()
        self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)
        for key, field in (('categories', 'targetCategoryId'), ('entries', 'targetRosterId')):
            invalid = copy.deepcopy(plan); invalid[key][0][field] = invalid[key][1][field]
            self.rejected(raw, json.dumps(invalid))
        plan['entries'][0]['targetRosterId'] = plan['categories'][0]['targetCategoryId']
        self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)

    def test_new_roster_cannot_create_people_link_accounts_or_keep_compensation(self):
        for update in ({'kind': 'person', 'personId': uid(900)}, {'personId': uid(900)}, {'linkedUserId': uid(901)}, {'compensationAction': 'keep', 'expectedCompensationVersion': 1}):
            self.bad_change(lambda p, u=update: p['entries'][0].update(u))

    def test_keep_person_kind_and_identity_rules_are_explicit(self):
        for kind, person in (('person', None), ('group', uid(900)), ('unresolved', uid(900)), ('invalid', None), ([], None)):
            self.bad_change(lambda p, k=kind, i=person: p['entries'][0].update(kind=k, personId=i), create=False)
        self.bad_change(lambda p: p['entries'][0].update(kind='person', personId='bad'), create=False)
        self.bad_change(lambda p: p['entries'][0].update(linkedUserId='bad'), create=False)

    def test_text_type_byte_limit_and_encoding_fail_privately(self):
        raw, plan = prepared()
        text = json.dumps(plan)
        for value in (text.encode(), None, {}, 42, '\ud800', text + '\ud800', ' ' * (16 * 1024 * 1024 + 1)):
            self.rejected(raw, value)
        padded = text + ' ' * (16 * 1024 * 1024 - len(text.encode()))
        self.assertEqual(parse_import_plan(raw, padded)[0], plan)
        self.rejected(raw, padded + ' ')
        self.rejected(raw, text.replace('"w1"', '"\\ud800"'))

    def test_source_id_length_and_unicode_are_validated_without_normalizing(self):
        for length, accepted in ((200, True), (201, False)):
            data = fixture(); table(data, 'working')['rows'][0][0] = 'ž' * length
            raw = encode(data); _, plan = prepared()
            plan['sourceSha256'] = hashlib.sha256(raw).hexdigest()
            plan['entries'][0]['sourceRowId'] = 'ž' * length
            if accepted:
                self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)
            else:
                self.rejected(raw, json.dumps(plan))

    def test_source_validation_failure_is_wrapped_without_leaking_details(self):
        _, plan = prepared()
        for raw in (b'private synthetic@example.invalid', None, 'not bytes', b'[]'):
            self.rejected(raw, json.dumps(plan))

    def test_operation_count_limit_and_no_input_mutation(self):
        raw, plan = prepared()
        self.bad_change(lambda p: p.update(entries=[p['entries'][0]] * 10001))
        self.bad_change(lambda p: p.update(categories=[p['categories'][0]] * 10001))
        source = bytearray(raw)
        self.rejected(source, json.dumps(plan))
        self.assertEqual(source, bytearray(raw))


if __name__ == '__main__':
    unittest.main()
