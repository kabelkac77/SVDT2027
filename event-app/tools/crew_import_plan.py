import hashlib
import json
import re

from crew_import_preview import build_preview
from crew_transfer_reconcile import reconcile_preview

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
_NIL_UUID = '00000000-0000-0000-0000-000000000000'
_HEX64_RE = re.compile(r'^[0-9a-f]{64}$')

_PERMANENT_GATES = (
    'OPERATOR_APPROVAL_REQUIRED',
    'VERIFIED_BACKUP_AND_RESTORE_REQUIRED',
    'EXPLICIT_ACTIVATION_REQUIRED',
)

_ROSTER_COMPARE_FIELDS = (
    'name', 'position', 'owner_label', 'email', 'phone',
    'status', 'term', 'friday', 'saturday', 'notes', 'archived',
)

_COMPENSATION_FIELDS = ('estimate', 'agreed', 'total', 'paid', 'barter', 'merch')

_PLAN_MAX_BYTES = 16 * 1024 * 1024


def _is_canonical_uuid(value):
    return isinstance(value, str) and bool(_UUID_RE.fullmatch(value)) and value != _NIL_UUID


def _is_valid_fingerprint(value):
    return isinstance(value, str) and bool(_HEX64_RE.fullmatch(value))


def _index_by(items, key):
    return {item[key]: item for item in items}


def _validate_mapping(mapping, preview):
    if not isinstance(mapping, dict) or set(mapping.keys()) != {'editionId', 'categories', 'entries'}:
        raise ValueError('bad mapping shape')
    if not _is_canonical_uuid(mapping['editionId']):
        raise ValueError('bad editionId')

    categories_map = mapping['categories']
    entries_map = mapping['entries']
    if not isinstance(categories_map, dict) or not isinstance(entries_map, dict):
        raise ValueError('bad mapping shape')

    source_category_ids = {c['sourceCategoryId'] for c in preview['categories']}
    source_row_ids = {e['sourceRowId'] for e in preview['entries']}

    if not source_category_ids.issuperset(categories_map.keys()):
        raise ValueError('unknown category key')
    if not source_row_ids.issuperset(entries_map.keys()):
        raise ValueError('unknown entry key')

    category_targets = set()
    for item in categories_map.values():
        if not isinstance(item, dict) or set(item.keys()) != {'id', 'action'}:
            raise ValueError('bad category item')
        if item['action'] not in ('create', 'keep'):
            raise ValueError('bad category action')
        if not _is_canonical_uuid(item['id']):
            raise ValueError('bad category id')
        if item['id'] in category_targets:
            raise ValueError('duplicate category target id')
        category_targets.add(item['id'])

    entry_targets = set()
    for item in entries_map.values():
        if not isinstance(item, dict):
            raise ValueError('bad entry item')
        action = item.get('action')
        if action not in ('create', 'keep'):
            raise ValueError('bad entry action')
        expected_keys = (
            {'id', 'action', 'compensationAction', 'kind'}
            if action == 'create'
            else {'id', 'action', 'compensationAction'}
        )
        if set(item.keys()) != expected_keys:
            raise ValueError('bad entry item keys')
        if not _is_canonical_uuid(item['id']):
            raise ValueError('bad entry id')
        if item['id'] in entry_targets:
            raise ValueError('duplicate entry target id')
        entry_targets.add(item['id'])

        comp_action = item['compensationAction']
        if comp_action not in ('create', 'keep'):
            raise ValueError('bad compensationAction')
        if action == 'create':
            if comp_action != 'create':
                raise ValueError('create roster requires create compensation')
            if item['kind'] not in ('group', 'unresolved'):
                raise ValueError('bad kind')

    complete = (
        source_category_ids == set(categories_map.keys())
        and source_row_ids == set(entries_map.keys())
    )
    return complete


def _build_category_ops(preview, categories_map, target_categories_by_id, conflicts):
    ops = []
    resolved_target_category_id = {}
    for cat in preview['categories']:
        source_category_id = cat['sourceCategoryId']
        item = categories_map[source_category_id]
        target_category_id = item['id']
        action = item['action']

        if action == 'create':
            if target_category_id in target_categories_by_id or any(c['name'] == cat['name'] for c in target_categories_by_id.values()):
                conflicts.add('TARGET_CONFLICTS')
            expected_version = 0
        else:
            target_cat = target_categories_by_id.get(target_category_id)
            if target_cat is None:
                conflicts.add('TARGET_CONFLICTS')
                expected_version = 0
            else:
                if target_cat['name'] != cat['name'] or target_cat['color'] != cat['color']:
                    conflicts.add('TARGET_CONFLICTS')
                expected_version = target_cat['version']

        if not 0 <= expected_version <= 2147483647:
            raise ValueError('version out of range')
        resolved_target_category_id[source_category_id] = target_category_id
        ops.append({
            'sourceCategoryId': source_category_id,
            'targetCategoryId': target_category_id,
            'action': action,
            'expectedVersion': expected_version,
        })
    return ops, resolved_target_category_id


def _build_entry_ops(
    preview,
    entries_map,
    resolved_target_category_id,
    target_entries_by_id,
    target_compensation_by_roster_id,
    conflicts,
):
    ops = []
    for entry in preview['entries']:
        source_row_id = entry['sourceRowId']
        item = entries_map[source_row_id]
        target_roster_id = item['id']
        action = item['action']
        compensation_action = item['compensationAction']

        if action == 'create':
            if target_roster_id in target_entries_by_id:
                conflicts.add('TARGET_CONFLICTS')
            expected_version = 0
            kind = item['kind']
            person_id = None
            linked_user_id = None
        else:
            target_entry = target_entries_by_id.get(target_roster_id)
            if target_entry is None:
                conflicts.add('TARGET_CONFLICTS')
                expected_version = 0
                kind = None
                person_id = None
                linked_user_id = None
            else:
                target_category_id = resolved_target_category_id.get(entry['sourceCategoryId'])
                if target_entry['category_id'] != target_category_id:
                    conflicts.add('TARGET_CONFLICTS')
                roster = entry['roster']
                for field in _ROSTER_COMPARE_FIELDS:
                    if roster[field] != target_entry[field]:
                        conflicts.add('TARGET_CONFLICTS')
                        break
                expected_version = target_entry['version']
                kind = target_entry['kind']
                person_id = target_entry['person_id']
                linked_user_id = target_entry['linked_user_id']

        existing_compensation = target_compensation_by_roster_id.get(target_roster_id)
        if compensation_action == 'create':
            if existing_compensation is not None:
                conflicts.add('TARGET_CONFLICTS')
            expected_compensation_version = 0
        else:
            if existing_compensation is None:
                conflicts.add('TARGET_CONFLICTS')
                expected_compensation_version = 0
            else:
                compensation = entry['compensation']
                for field in _COMPENSATION_FIELDS:
                    if compensation[field] != existing_compensation[field]:
                        conflicts.add('TARGET_CONFLICTS')
                        break
                expected_compensation_version = existing_compensation['version']

        if not 0 <= expected_version <= 2147483647 or not 0 <= expected_compensation_version <= 2147483647:
            raise ValueError('version out of range')
        ops.append({
            'sourceRowId': source_row_id,
            'targetRosterId': target_roster_id,
            'action': action,
            'expectedVersion': expected_version,
            'compensationAction': compensation_action,
            'expectedCompensationVersion': expected_compensation_version,
            'kind': kind,
            'personId': person_id,
            'linkedUserId': linked_user_id,
        })
    return ops


def _build_import_plan(tables_bytes, mapping, target):
    preview = build_preview(tables_bytes)
    source_sha256 = preview['sourceSha256']

    blockers = set(_PERMANENT_GATES)

    mapping_complete = False
    if mapping is None:
        blockers.add('MAPPING_REQUIRED')
    else:
        mapping_complete = _validate_mapping(mapping, preview)
        if not mapping_complete:
            blockers.add('MAPPING_REQUIRED')

    target_fingerprint = None
    target_ready = False
    if target is None:
        blockers.add('TARGET_EXPORT_REQUIRED')
        blockers.add('PRIVATE_PROVENANCE_SCHEMA_REQUIRED')
    else:
        report = reconcile_preview(tables_bytes, None, target)
        if mapping is not None and mapping['editionId'] != target['edition']['id']:
            raise ValueError('foreign edition')

        if not target['provenanceReady']:
            blockers.add('PRIVATE_PROVENANCE_SCHEMA_REQUIRED')
        if target['edition']['archived']:
            blockers.add('TARGET_ARCHIVED')
        source_package_seen = bool(report.get('sourcePackageSeen'))
        if source_package_seen:
            blockers.add('SOURCE_ALREADY_PRESENT_REVIEW_REQUIRED')

        fingerprint = target.get('targetFingerprint')
        if _is_valid_fingerprint(fingerprint):
            target_fingerprint = fingerprint
        else:
            blockers.add('TARGET_FINGERPRINT_REQUIRED')

        target_ready = (
            target['provenanceReady']
            and not target['edition']['archived']
            and not source_package_seen
            and target_fingerprint is not None
        )

    plan_text = None
    plan_sha256 = None
    counts = {'categories': len(preview['categories']), 'entries': len(preview['entries'])}

    if mapping is not None and mapping_complete and target is not None and target_ready:
        conflicts = set()
        target_categories_by_id = _index_by(target['categories'], 'id')
        target_entries_by_id = _index_by(target['entries'], 'id')
        target_compensation_by_roster_id = _index_by(target['compensation'], 'roster_id')

        category_ops, resolved_target_category_id = _build_category_ops(
            preview, mapping['categories'], target_categories_by_id, conflicts,
        )
        entry_ops = _build_entry_ops(
            preview,
            mapping['entries'],
            resolved_target_category_id,
            target_entries_by_id,
            target_compensation_by_roster_id,
            conflicts,
        )
        blockers.update(conflicts)

        if not conflicts:
            plan_obj = {
                'version': 1,
                'editionId': mapping['editionId'],
                'sourceSha256': source_sha256,
                'targetFingerprint': target_fingerprint,
                'categories': category_ops,
                'entries': entry_ops,
            }
            plan_text = json.dumps(
                plan_obj,
                ensure_ascii=False,
                sort_keys=True,
                separators=(',', ':'),
                allow_nan=False,
            )
            if len(plan_text.encode('utf-8')) > _PLAN_MAX_BYTES:
                raise ValueError('plan exceeds size limit')
            plan_sha256 = hashlib.sha256(plan_text.encode('utf-8')).hexdigest()

    return {
        'version': 1,
        'mode': 'plan_preparation',
        'applyReady': False,
        'sourceSha256': source_sha256,
        'targetFingerprint': target_fingerprint,
        'planText': plan_text,
        'planSha256': plan_sha256,
        'counts': counts,
        'blockers': sorted(blockers),
    }


def build_import_plan(tables_bytes, mapping=None, target=None):
    try:
        return _build_import_plan(tables_bytes, mapping, target)
    except Exception:
        raise ValueError('CREW_IMPORT_PLAN_FAILED') from None
