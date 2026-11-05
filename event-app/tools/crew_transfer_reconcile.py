"""Pure stdlib reconciliation preview comparing a private crew source to a full target export."""
import re

from crew_import_preview import build_preview

_UUID_RE = re.compile(r'\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z')
_SHA256_RE = re.compile(r'\A[0-9a-f]{64}\Z')
_NIL_UUID = '00000000-0000-0000-0000-000000000000'

_KIND_VALUES = {'person', 'group', 'unresolved'}
_STATUS_VALUES = {'candidate', 'contacted', 'confirmed', 'declined', 'unknown'}
_ROSTER_TEXT_FIELDS = (
    'name', 'position', 'owner_label', 'email', 'phone', 'term', 'friday', 'saturday', 'notes',
)
_COMPENSATION_AMOUNT_FIELDS = ('estimate', 'agreed', 'total', 'paid')
_COMPENSATION_TEXT_FIELDS = ('barter', 'merch')
_MAX_ITEMS = 10000
_MAX_AMOUNT = 99999999999

_FAILURE = 'CREW_RECONCILE_FAILED'


def reconcile_preview(tables_bytes, mapping=None, target=None):
    try:
        preview = build_preview(tables_bytes)
        return _build_result(preview, mapping, target)
    except Exception:
        raise ValueError(_FAILURE) from None


def _fail():
    raise ValueError()


def _is_uuid(value):
    if not isinstance(value, str):
        return False
    if not _UUID_RE.match(value):
        return False
    return value != _NIL_UUID


def _is_bool(value):
    return isinstance(value, bool)


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _is_positive_int(value):
    return _is_int(value) and value > 0


def _is_amount(value):
    if value is None:
        return True
    return _is_int(value) and 0 <= value <= _MAX_AMOUNT


def _build_result(preview, mapping, target):
    source_categories = preview['categories']
    source_entries = preview['entries']
    source_sha256 = preview['sourceSha256']

    source_category_ids = {c['sourceCategoryId'] for c in source_categories}
    source_row_ids = {e['sourceRowId'] for e in source_entries}

    mapping_norm = _validate_mapping(mapping, source_category_ids, source_row_ids, target)
    target_norm = _validate_target(target, source_sha256, source_row_ids, mapping_norm)

    blockers = {
        'EXPLICIT_ACTIVATION_REQUIRED',
        'IDENTITY_AND_ACCOUNT_REVIEW_REQUIRED',
        'VERIFIED_BACKUP_AND_RESTORE_REQUIRED',
    }

    target_available = target_norm is not None
    if not target_available:
        blockers.add('TARGET_EXPORT_REQUIRED')
        blockers.add('PRIVATE_PROVENANCE_SCHEMA_REQUIRED')
    else:
        if target_norm['archived']:
            blockers.add('TARGET_ARCHIVED')
        if not target_norm['provenanceReady']:
            blockers.add('PRIVATE_PROVENANCE_SCHEMA_REQUIRED')

    mapping_entries = mapping_norm['entries'] if mapping_norm else {}
    mapping_categories = mapping_norm['categories'] if mapping_norm else {}

    if mapping_norm is None:
        blockers.add('MAPPING_REVIEW_REQUIRED')
    elif len(mapping_entries) < len(source_row_ids) or len(mapping_categories) < len(source_category_ids):
        blockers.add('MAPPING_REVIEW_REQUIRED')

    differences_present = False
    mapped_rows = 0
    matching_rows = 0
    differing_rows = 0
    unmapped_rows = 0
    unavailable_rows = 0

    rows = []
    for entry in source_entries:
        source_row_id = entry['sourceRowId']
        target_roster_id = mapping_entries.get(source_row_id)
        if target_roster_id is None:
            status, fields = 'unmapped', []
            unmapped_rows += 1
        else:
            mapped_rows += 1
            if not target_available:
                status, fields = 'target_unavailable', []
                unavailable_rows += 1
            else:
                status, fields = _compare_entry(entry, target_roster_id, mapping_categories, target_norm)
                if status == 'matches':
                    matching_rows += 1
                elif status == 'differs':
                    differing_rows += 1
                    differences_present = True
                else:
                    differences_present = True
        rows.append({
            'sourceRowId': source_row_id,
            'targetRosterId': target_roster_id,
            'status': status,
            'fields': fields,
        })

    categories_report = []
    for cat in source_categories:
        source_category_id = cat['sourceCategoryId']
        target_category_id = mapping_categories.get(source_category_id)
        if target_category_id is None:
            status, fields = 'unmapped', []
        elif not target_available:
            status, fields = 'target_unavailable', []
        else:
            status, fields = _compare_category(cat, target_category_id, target_norm)
            if status != 'matches':
                differences_present = True
        categories_report.append({
            'sourceCategoryId': source_category_id,
            'targetCategoryId': target_category_id,
            'status': status,
            'fields': fields,
        })

    if differences_present:
        blockers.add('TARGET_DIFFERENCES_PRESENT')

    target_only_roster_ids = []
    source_package_seen = False
    if target_available:
        mapped_roster_ids = set(mapping_entries.values())
        all_target_roster_ids = set(target_norm['entriesById'].keys())
        target_only_roster_ids = sorted(all_target_roster_ids - mapped_roster_ids)
        source_package_seen = any(
            pkg['source_sha256'] == source_sha256 for pkg in target_norm['sourcePackages']
        )

    return {
        'version': 1,
        'mode': 'reconciliation_only',
        'applyReady': False,
        'sourceSha256': source_sha256,
        'targetAvailable': target_available,
        'targetEditionId': target_norm['editionId'] if target_available else None,
        'rows': rows,
        'categories': categories_report,
        'targetOnlyRosterIds': target_only_roster_ids,
        'sourcePackageSeen': source_package_seen,
        'counts': {
            'sourceRows': len(source_entries),
            'mappedRows': mapped_rows,
            'matchingRows': matching_rows,
            'differingRows': differing_rows,
            'unmappedRows': unmapped_rows,
            'unavailableRows': unavailable_rows,
        },
        'blockers': sorted(blockers),
    }


def _compare_entry(entry, target_roster_id, mapping_categories, target_norm):
    target_roster = target_norm['entriesById'].get(target_roster_id)
    if target_roster is None:
        return 'missing_target', []

    source_category_id = entry['sourceCategoryId']
    target_category_id = mapping_categories.get(source_category_id)
    if target_category_id is None:
        return 'missing_category_mapping', []

    if target_category_id not in target_norm['categoriesById']:
        return 'missing_target_category', []

    compensation = target_norm['compensationByRosterId'].get(target_roster_id)
    if compensation is None:
        return 'missing_compensation', []

    fields = set()
    roster = entry['roster']
    for field in _ROSTER_TEXT_FIELDS:
        if roster[field] != target_roster[field]:
            fields.add('roster.' + field)
    if roster['archived'] != target_roster['archived']:
        fields.add('roster.archived')
    if roster['status'] != target_roster['status']:
        fields.add('roster.status')
    if roster['kind'] != target_roster['kind']:
        fields.add('roster.kind')
    if roster['person_id'] != target_roster['person_id']:
        fields.add('roster.person_id')
    if roster['linked_user_id'] != target_roster['linked_user_id']:
        fields.add('roster.linked_user_id')
    if target_category_id != target_roster['category_id']:
        fields.add('roster.category_id')

    comp = entry['compensation']
    for field in _COMPENSATION_AMOUNT_FIELDS:
        if comp[field] != compensation[field]:
            fields.add('compensation.' + field)
    for field in _COMPENSATION_TEXT_FIELDS:
        if comp[field] != compensation[field]:
            fields.add('compensation.' + field)

    if fields:
        return 'differs', sorted(fields)
    return 'matches', []


def _compare_category(cat, target_category_id, target_norm):
    target_category = target_norm['categoriesById'].get(target_category_id)
    if target_category is None:
        return 'missing_target', []
    fields = set()
    if cat['name'] != target_category['name']:
        fields.add('name')
    if cat['color'] != target_category['color']:
        fields.add('color')
    if fields:
        return 'differs', sorted(fields)
    return 'matches', []


def _validate_mapping(mapping, source_category_ids, source_row_ids, target):
    if mapping is None:
        return None
    if not isinstance(mapping, dict):
        _fail()
    if set(mapping.keys()) != {'editionId', 'categories', 'entries'}:
        _fail()

    edition_id = mapping['editionId']
    if not _is_uuid(edition_id):
        _fail()
    if isinstance(target, dict):
        target_edition = target.get('edition')
        if isinstance(target_edition, dict) and _is_uuid(target_edition.get('id')):
            if edition_id != target_edition['id']:
                _fail()

    categories = mapping['categories']
    entries = mapping['entries']
    if not isinstance(categories, dict) or not isinstance(entries, dict):
        _fail()
    if len(categories) > _MAX_ITEMS or len(entries) > _MAX_ITEMS:
        _fail()

    normalized_categories = {}
    seen_target_categories = set()
    for source_category_id, target_category_id in categories.items():
        if source_category_id not in source_category_ids:
            _fail()
        if not _is_uuid(target_category_id):
            _fail()
        if target_category_id in seen_target_categories:
            _fail()
        seen_target_categories.add(target_category_id)
        normalized_categories[source_category_id] = target_category_id

    normalized_entries = {}
    seen_target_rosters = set()
    for source_row_id, target_roster_id in entries.items():
        if source_row_id not in source_row_ids:
            _fail()
        if not _is_uuid(target_roster_id):
            _fail()
        if target_roster_id in seen_target_rosters:
            _fail()
        seen_target_rosters.add(target_roster_id)
        normalized_entries[source_row_id] = target_roster_id

    return {'editionId': edition_id, 'categories': normalized_categories, 'entries': normalized_entries}


def _validate_target(target, source_sha256, source_row_ids, mapping_norm):
    if target is None:
        return None
    if not isinstance(target, dict):
        _fail()

    if target.get('complete') is not True:
        _fail()
    if target.get('canReadCompensation') is not True:
        _fail()
    captured_at = target.get('capturedAt')
    if not isinstance(captured_at, str) or not captured_at.strip():
        _fail()
    provenance_ready = target.get('provenanceReady')
    if not _is_bool(provenance_ready):
        _fail()

    edition = target.get('edition')
    if not isinstance(edition, dict):
        _fail()
    edition_id = edition.get('id')
    if not _is_uuid(edition_id):
        _fail()
    year = edition.get('year')
    if not _is_int(year) or year != 2027:
        _fail()
    archived = edition.get('archived')
    if not _is_bool(archived):
        _fail()

    categories_raw = target.get('categories')
    entries_raw = target.get('entries')
    compensation_raw = target.get('compensation')
    source_packages_raw = target.get('sourcePackages')
    source_links_raw = target.get('sourceLinks')
    for value in (categories_raw, entries_raw, compensation_raw, source_packages_raw, source_links_raw):
        if not isinstance(value, list) or len(value) > _MAX_ITEMS:
            _fail()

    categories_by_id = {}
    for cat in categories_raw:
        if not isinstance(cat, dict):
            _fail()
        cat_id = cat.get('id')
        if not _is_uuid(cat_id) or cat_id in categories_by_id:
            _fail()
        if cat.get('edition_id') != edition_id:
            _fail()
        name = cat.get('name')
        color = cat.get('color')
        if not isinstance(name, str) or not name.strip() or len(name) > 100 or not isinstance(color, str) or color not in {f'cat-{i}' for i in range(12)}:
            _fail()
        if not _is_positive_int(cat.get('version')):
            _fail()
        categories_by_id[cat_id] = {'id': cat_id, 'name': name, 'color': color}

    entries_by_id = {}
    for entry in entries_raw:
        if not isinstance(entry, dict):
            _fail()
        entry_id = entry.get('id')
        if not _is_uuid(entry_id) or entry_id in entries_by_id:
            _fail()
        if entry.get('edition_id') != edition_id:
            _fail()
        category_id = entry.get('category_id')
        if not _is_uuid(category_id) or category_id not in categories_by_id:
            _fail()
        if not _is_positive_int(entry.get('version')):
            _fail()

        kind = entry.get('kind')
        if kind not in _KIND_VALUES:
            _fail()
        if 'person_id' not in entry or 'linked_user_id' not in entry:
            _fail()
        person_id = entry.get('person_id')
        if kind == 'person':
            if not _is_uuid(person_id):
                _fail()
        elif person_id is not None:
            _fail()
        linked_user_id = entry.get('linked_user_id')
        if linked_user_id is not None and not _is_uuid(linked_user_id):
            _fail()
        status = entry.get('status')
        if status not in _STATUS_VALUES:
            _fail()
        archived_flag = entry.get('archived')
        if not _is_bool(archived_flag):
            _fail()

        texts = {}
        for field in _ROSTER_TEXT_FIELDS:
            value = entry.get(field)
            if not isinstance(value, str):
                _fail()
            texts[field] = value
        if status == 'confirmed' and not texts['term'].strip():
            _fail()

        entries_by_id[entry_id] = {
            'id': entry_id,
            'category_id': category_id,
            'kind': kind,
            'person_id': person_id,
            'linked_user_id': linked_user_id,
            'status': status,
            'archived': archived_flag,
            **texts,
        }

    compensation_by_roster_id = {}
    for comp in compensation_raw:
        if not isinstance(comp, dict):
            _fail()
        roster_id = comp.get('roster_id')
        if not _is_uuid(roster_id) or roster_id not in entries_by_id:
            _fail()
        if roster_id in compensation_by_roster_id:
            _fail()
        if comp.get('edition_id') != edition_id:
            _fail()
        if not _is_positive_int(comp.get('version')):
            _fail()
        if not set(_COMPENSATION_AMOUNT_FIELDS).issubset(comp):
            _fail()
        amounts = {}
        for field in _COMPENSATION_AMOUNT_FIELDS:
            value = comp.get(field)
            if not _is_amount(value):
                _fail()
            amounts[field] = value
        texts = {}
        for field in _COMPENSATION_TEXT_FIELDS:
            value = comp.get(field)
            if not isinstance(value, str):
                _fail()
            texts[field] = value
        compensation_by_roster_id[roster_id] = {**amounts, **texts}

    packages_by_id = {}
    seen_hashes = set()
    for package in source_packages_raw:
        if not isinstance(package, dict):
            _fail()
        package_id = package.get('id')
        if not _is_uuid(package_id) or package_id in packages_by_id:
            _fail()
        if package.get('edition_id') != edition_id:
            _fail()
        source_sha = package.get('source_sha256')
        if not isinstance(source_sha, str) or not _SHA256_RE.match(source_sha):
            _fail()
        if source_sha in seen_hashes:
            _fail()
        seen_hashes.add(source_sha)
        packages_by_id[package_id] = {'id': package_id, 'source_sha256': source_sha}

    current_package_ids = {
        package_id for package_id, package in packages_by_id.items()
        if package['source_sha256'] == source_sha256
    }

    seen_package_row = set()
    seen_package_roster = set()
    for link in source_links_raw:
        if not isinstance(link, dict):
            _fail()
        package_id = link.get('package_id')
        if package_id not in packages_by_id:
            _fail()
        if link.get('edition_id') != edition_id:
            _fail()
        source_row_id = link.get('source_row_id')
        if not isinstance(source_row_id, str) or not source_row_id:
            _fail()
        roster_id = link.get('roster_id')
        if not _is_uuid(roster_id) or roster_id not in entries_by_id:
            _fail()

        pair_row = (package_id, source_row_id)
        pair_roster = (package_id, roster_id)
        if pair_row in seen_package_row or pair_roster in seen_package_roster:
            _fail()
        seen_package_row.add(pair_row)
        seen_package_roster.add(pair_roster)

        if package_id in current_package_ids:
            if source_row_id not in source_row_ids:
                _fail()
            if mapping_norm is not None:
                mapped_target = mapping_norm['entries'].get(source_row_id)
                if mapped_target is not None and mapped_target != roster_id:
                    _fail()

    return {
        'editionId': edition_id,
        'archived': archived,
        'provenanceReady': provenance_ready,
        'categoriesById': categories_by_id,
        'entriesById': entries_by_id,
        'compensationByRosterId': compensation_by_roster_id,
        'sourcePackages': list(packages_by_id.values()),
    }
