"""Additional synthetic boundary acceptance for the pure plan reader."""

import copy
import hashlib
import json
import unittest
from unittest.mock import patch

from crew_import_verify_plan_test import prepared, parse_import_plan
from crew_import_preview_test import encode, fixture, table
from crew_transfer_reconcile_test import uid


class PlanBoundaryTests(unittest.TestCase):
    def rejected(self, raw, text):
        with self.assertRaises(ValueError) as raised:
            parse_import_plan(raw, text)
        self.assertEqual(str(raised.exception), 'CREW_IMPORT_VERIFY_FAILED')
        self.assertIsNone(raised.exception.__cause__)
        self.assertTrue(raised.exception.__suppress_context__)

    def test_category_id_character_boundary_and_paired_unicode(self):
        for category in ('ž' * 100, 'desk-😀'):
            raw, plan = prepared()
            data = fixture()
            table(data, 'categories')['rows'][0][0] = category
            row = table(data, 'working')['rows'][0]
            row[2] = category
            content = json.loads(row[3])
            content['categoryId'] = category
            row[3] = json.dumps(content)
            raw = encode(data)
            plan['sourceSha256'] = hashlib.sha256(raw).hexdigest()
            plan['categories'][0]['sourceCategoryId'] = category
            # ensure_ascii produces valid escaped surrogate pairs for the emoji.
            self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)
        plan['categories'][0]['sourceCategoryId'] = 'ž' * 101
        self.rejected(raw, json.dumps(plan))

    def test_lone_surrogate_keys_values_and_duplicate_escaped_keys(self):
        raw, plan = prepared()
        text = json.dumps(plan)
        for escape in ('\\ud800', '\\udfff'):
            self.rejected(raw, text.replace('sourceRowId', escape))
            self.rejected(raw, text.replace('w1', escape))
        self.rejected(raw, text.replace('"version": 1', '"version": 1, "\\u0076ersion": 1'))

    def test_byte_limit_counts_utf8_bytes_not_codepoints(self):
        raw, plan = prepared()
        # Valid JSON whitespace consumes exactly the complete byte allowance.
        text = json.dumps(plan, ensure_ascii=False)
        limit = 16 * 1024 * 1024
        text += ' ' * (limit - len(text.encode()))
        self.assertEqual(parse_import_plan(raw, text)[0], plan)
        self.rejected(raw, text + ' ')
        # A multi-byte value just below the codepoint limit still exceeds bytes.
        self.rejected(raw, '"' + 'ž' * (limit // 2) + '"')

    def test_empty_source_accepts_only_empty_operations(self):
        raw, plan = prepared()
        data = fixture()
        table(data, 'working')['rows'] = []
        table(data, 'categories')['rows'] = []
        raw = encode(data)
        plan.update(sourceSha256=hashlib.sha256(raw).hexdigest(), categories=[], entries=[])
        self.assertEqual(parse_import_plan(raw, json.dumps(plan))[0], plan)
        plan['categories'] = prepared()[1]['categories']
        self.rejected(raw, json.dumps(plan))

    def test_exactly_ten_thousand_operations_are_supported(self):
        _, plan = prepared()
        data = fixture()
        category = table(data, 'categories')['rows'][0]
        row = table(data, 'working')['rows'][0]
        categories, entries, source_categories, source_rows = [], [], [], []
        for i in range(10000):
            cat = copy.deepcopy(category)
            cat[:3] = ['cat' + str(i), 'Desk ' + str(i), 'desk' + str(i)]
            source_categories.append(cat)
            source_row = copy.deepcopy(row)
            source_row[0], source_row[2] = 'w' + str(i), cat[0]
            content = json.loads(source_row[3])
            content['categoryId'] = cat[0]
            source_row[3] = json.dumps(content)
            source_rows.append(source_row)
            category_op = dict(plan['categories'][0], sourceCategoryId=cat[0], targetCategoryId=uid(i + 1))
            row_op = dict(plan['entries'][0], sourceRowId=source_row[0], targetRosterId=uid(i + 1))
            categories.append(category_op)
            entries.append(row_op)
        table(data, 'categories')['rows'] = source_categories
        table(data, 'working')['rows'] = source_rows
        raw = encode(data)
        plan.update(sourceSha256=hashlib.sha256(raw).hexdigest(), categories=categories, entries=entries)
        parsed, preview = parse_import_plan(raw, json.dumps(plan))
        self.assertEqual(parsed, plan)
        self.assertEqual(len(preview['entries']), 10000)
        self.assertEqual(len(preview['categories']), 10000)

    def test_subclass_hooks_are_not_executed(self):
        class DangerousText(str):
            def encode(self, *args, **kwargs):
                raise AssertionError('must never execute')

        class DangerousBytes(bytes):
            def decode(self, *args, **kwargs):
                raise AssertionError('must never execute')

        raw, plan = prepared()
        text = json.dumps(plan)
        self.rejected(raw, DangerousText(text))
        self.rejected(DangerousBytes(raw), text)

    def test_unexpected_os_error_is_not_mislabeled_as_invalid_input(self):
        raw, plan = prepared()
        with patch('crew_import_verify_plan.build_preview', side_effect=OSError('synthetic operational error')):
            with self.assertRaises(OSError):
                parse_import_plan(raw, json.dumps(plan))


if __name__ == '__main__':
    unittest.main()
