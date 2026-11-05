"""Pure, side-effect-free preview builder for the crew roster/compensation transfer."""

import base64
import hashlib
import json
import math

FAIL_ERROR = "CREW_IMPORT_PREVIEW_FAILED"

MAX_INPUT_BYTES = 128 * 1024 * 1024
MAX_ROWS_PER_TABLE = 10000

REQUIRED_TABLE_COLUMNS = {
    "meta": ["key", "value"],
    "history": ["id", "year", "content"],
    "categories": ["id", "name", "name_key", "color", "sort_order", "version"],
    "working": ["id", "year", "category_id", "content", "source_id", "version", "updated_at"],
    "audit": ["id", "at", "kind", "record_id", "before_json", "after_json"],
    "requests": ["id", "fingerprint", "response"],
}

TEXT_LIMITS = {
    "name": 200,
    "categoryId": 100,
    "position": 500,
    "owner": 500,
    "email": 500,
    "phone": 500,
    "contactOriginal": 2000,
    "statusNote": 4000,
    "notes": 10000,
    "barter": 4000,
    "merch": 2000,
    "term": 1000,
    "friday": 100,
    "saturday": 100,
}

OPTIONAL_CONTENT_TEXT_FIELDS = ("friday", "saturday")
REQUIRED_CONTENT_TEXT_FIELDS = tuple(
    field for field in TEXT_LIMITS if field not in OPTIONAL_CONTENT_TEXT_FIELDS
)

STATUSES = {"candidate", "contacted", "confirmed", "declined", "unknown"}
MONEY_KEYS = ("estimate", "agreed", "total", "paid")
MONEY_MAX = 99999999999
VALID_CATEGORY_COLORS = {"cat-%d" % i for i in range(12)}

WORKING_YEAR = "2027"
HISTORY_YEARS = {"2025", "2026"}
SOURCE_HISTORY_YEAR = "2026"

MAPPED_CONTENT_KEYS = {
    "name", "categoryId", "position", "owner", "email", "phone",
    "status", "term", "friday", "saturday", "archived", "money",
    "notes", "barter", "merch",
}
UNMAPPED_CONTENT_KEYS = ("statusNote", "contactOriginal")

BLOCKERS = [
    "IDENTITY_MAPPING_REQUIRED",
    "PRIVATE_PROVENANCE_SCHEMA_REQUIRED",
    "TARGET_PROJECT_AND_EDITION_REQUIRED",
    "ACCOUNT_SCOPES_REQUIRED",
    "VERIFIED_BACKUP_AND_RESTORE_REQUIRED",
]


def _fail():
    raise ValueError(FAIL_ERROR)


def _is_int(value):
    return isinstance(value, int) and not isinstance(value, bool)


def _is_blob_marker(value):
    if not isinstance(value, dict) or set(value.keys()) != {"type", "base64"}:
        return False
    if value.get("type") != "blob" or not isinstance(value.get("base64"), str):
        return False
    try:
        base64.b64decode(value["base64"], validate=True)
    except Exception:
        return False
    return True


def _is_valid_scalar(value):
    if value is None or isinstance(value, str):
        return True
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, dict):
        return _is_blob_marker(value)
    return False


def _strict_json_loads(text):
    def _reject_duplicates(pairs):
        seen = set()
        result = {}
        for key, value in pairs:
            if key in seen:
                _fail()
            seen.add(key)
            result[key] = value
        return result

    def _reject_constant(_name):
        _fail()

    def _finite_float(text):
        value = float(text)
        if not math.isfinite(value):
            _fail()
        return value

    try:
        return json.loads(
            text,
            object_pairs_hook=_reject_duplicates,
            parse_constant=_reject_constant,
            parse_float=_finite_float,
        )
    except ValueError:
        _fail()
    except RecursionError:
        _fail()


def _validate_text_field(value, limit):
    if not isinstance(value, str) or len(value) > limit or "\x00" in value:
        _fail()
    return value


def _parse_tables(tables_bytes):
    if type(tables_bytes) is not bytes:
        _fail()
    if len(tables_bytes) > MAX_INPUT_BYTES:
        _fail()
    try:
        text = tables_bytes.decode("utf-8")
    except UnicodeDecodeError:
        _fail()

    decoded = _strict_json_loads(text)
    if not isinstance(decoded, list):
        _fail()

    tables_by_name = {}
    for table in decoded:
        if not isinstance(table, dict) or set(table.keys()) != {"name", "columns", "rows"}:
            _fail()
        name = table["name"]
        columns = table["columns"]
        rows = table["rows"]
        if not isinstance(name, str) or not name or name in tables_by_name:
            _fail()
        if not isinstance(columns, list):
            _fail()
        for column in columns:
            if not isinstance(column, str) or not column:
                _fail()
        if len(set(columns)) != len(columns):
            _fail()
        if not isinstance(rows, list) or len(rows) > MAX_ROWS_PER_TABLE:
            _fail()
        for row in rows:
            if not isinstance(row, list) or len(row) != len(columns):
                _fail()
            for cell in row:
                if not _is_valid_scalar(cell):
                    _fail()
        tables_by_name[name] = {"columns": columns, "rows": rows}
    return decoded, tables_by_name


def _column_index(columns, table_name):
    index = {}
    for name in REQUIRED_TABLE_COLUMNS[table_name]:
        if name not in columns:
            _fail()
        index[name] = columns.index(name)
    return index


def _validate_meta(table):
    index = _column_index(table["columns"], "meta")
    initialized_value = None
    found = False
    keys = set()
    for row in table["rows"]:
        key = row[index["key"]]
        if not isinstance(key, str) or not key or key in keys:
            _fail()
        keys.add(key)
        if row[index["key"]] == "initialized":
            found = True
            initialized_value = row[index["value"]]
    if not found or not isinstance(initialized_value, str) or not initialized_value.strip():
        _fail()


def _validate_history(table):
    index = _column_index(table["columns"], "history")
    ids_by_year = {"2025": set(), "2026": set()}
    seen_ids = set()
    for row in table["rows"]:
        row_id = row[index["id"]]
        year = row[index["year"]]
        content = row[index["content"]]
        if not isinstance(row_id, str) or not row_id or row_id in seen_ids:
            _fail()
        seen_ids.add(row_id)
        if not isinstance(year, str) or year not in HISTORY_YEARS:
            _fail()
        if not isinstance(content, str):
            _fail()
        _strict_json_loads(content)
        ids_by_year[year].add(row_id)
    return ids_by_year


def _validate_categories(table):
    index = _column_index(table["columns"], "categories")
    category_ids = set()
    name_keys = set()
    parsed = []
    for row in table["rows"]:
        row_id = row[index["id"]]
        name = row[index["name"]]
        name_key = row[index["name_key"]]
        color = row[index["color"]]
        sort_order = row[index["sort_order"]]
        version = row[index["version"]]
        if not isinstance(row_id, str) or not row_id or row_id in category_ids:
            _fail()
        if not isinstance(name_key, str) or not name_key or name_key in name_keys:
            _fail()
        if not isinstance(name, str) or not name.strip() or len(name) > 100 or "\x00" in name:
            _fail()
        if color not in VALID_CATEGORY_COLORS:
            _fail()
        if not _is_int(sort_order) or sort_order < 0:
            _fail()
        if not _is_int(version) or version < 1:
            _fail()
        category_ids.add(row_id)
        name_keys.add(name_key)
        parsed.append((sort_order, row_id, name, color, version))

    parsed.sort(key=lambda item: (item[0], item[1]))
    categories = [
        {
            "sourceCategoryId": row_id,
            "name": name,
            "color": color,
            "sortOrder": sort_order,
            "sourceVersion": version,
            "requiredCount": None,
            "requiredTerm": "",
        }
        for sort_order, row_id, name, color, version in parsed
    ]
    return categories, category_ids


def _validate_content_text_fields(content):
    values = {}
    for field in REQUIRED_CONTENT_TEXT_FIELDS:
        if field not in content:
            _fail()
        values[field] = _validate_text_field(content[field], TEXT_LIMITS[field])
    for field in OPTIONAL_CONTENT_TEXT_FIELDS:
        if field in content:
            values[field] = _validate_text_field(content[field], TEXT_LIMITS[field])
        else:
            values[field] = ""
    return values


def _validate_money_field(content):
    money = content.get("money")
    if not isinstance(money, dict):
        _fail()
    result = {}
    extra = {}
    for key in MONEY_KEYS:
        if key not in money:
            _fail()
        value = money[key]
        if value is not None and (not _is_int(value) or value < 0 or value > MONEY_MAX):
            _fail()
        result[key] = value
    for key, value in money.items():
        if key not in MONEY_KEYS:
            extra[key] = value
    return result, extra


def _validate_working(table, category_ids, history_ids_2026):
    index = _column_index(table["columns"], "working")
    seen_ids = set()
    entries = []
    for row in table["rows"]:
        row_id = row[index["id"]]
        year = row[index["year"]]
        if not isinstance(row_id, str) or not row_id or row_id in seen_ids:
            _fail()
        seen_ids.add(row_id)
        if not isinstance(year, str) or year != WORKING_YEAR:
            _fail()

        category_id = row[index["category_id"]]
        content_raw = row[index["content"]]
        source_id = row[index["source_id"]]
        version = row[index["version"]]
        updated_at = row[index["updated_at"]]

        if not isinstance(category_id, str) or category_id not in category_ids:
            _fail()
        if not isinstance(content_raw, str):
            _fail()
        content = _strict_json_loads(content_raw)
        if not isinstance(content, dict):
            _fail()
        if source_id is not None and (
            not isinstance(source_id, str) or source_id not in history_ids_2026
        ):
            _fail()
        if not _is_int(version) or version < 1:
            _fail()
        if not isinstance(updated_at, str) or not updated_at:
            _fail()

        text_values = _validate_content_text_fields(content)
        if not text_values["name"].strip():
            _fail()
        if text_values["categoryId"] != category_id:
            _fail()

        status = content.get("status")
        if status not in STATUSES:
            _fail()
        if status == "confirmed" and not text_values["term"].strip():
            _fail()

        archived = content.get("archived")
        if not isinstance(archived, bool):
            _fail()

        money_values, extra_money = _validate_money_field(content)

        roster = {
            "kind": "unresolved",
            "person_id": None,
            "linked_user_id": None,
            "name": text_values["name"],
            "position": text_values["position"],
            "owner_label": text_values["owner"],
            "email": text_values["email"],
            "phone": text_values["phone"],
            "status": status,
            "term": text_values["term"],
            "friday": text_values["friday"],
            "saturday": text_values["saturday"],
            "notes": text_values["notes"],
            "archived": archived,
        }
        compensation = {
            "estimate": money_values["estimate"],
            "agreed": money_values["agreed"],
            "total": money_values["total"],
            "paid": money_values["paid"],
            "barter": text_values["barter"],
            "merch": text_values["merch"],
        }
        unmapped = {
            "statusNote": text_values["statusNote"],
            "contactOriginal": text_values["contactOriginal"],
        }
        if extra_money:
            unmapped["money"] = extra_money
        for key, value in content.items():
            if key in MAPPED_CONTENT_KEYS or key in UNMAPPED_CONTENT_KEYS:
                continue
            unmapped[key] = value

        entries.append({
            "sourceRowId": row_id,
            "sourceCategoryId": category_id,
            "sourceId": source_id,
            "sourceVersion": version,
            "updatedAt": updated_at,
            "roster": roster,
            "compensation": compensation,
            "unmapped": unmapped,
        })
    return entries


def _validate_auxiliary_ids(table, numeric):
    key = table["columns"].index("id")
    seen = set()
    for row in table["rows"]:
        value = row[key]
        if numeric:
            if not _is_int(value) or value < 1:
                _fail()
        elif not isinstance(value, str) or not value:
            _fail()
        if value in seen:
            _fail()
        seen.add(value)


def _collect_warnings(tables_by_name):
    warnings = []
    if set(tables_by_name) - set(REQUIRED_TABLE_COLUMNS):
        warnings.append("UNKNOWN_TABLE_PRESERVED")
    for name, required in REQUIRED_TABLE_COLUMNS.items():
        table = tables_by_name.get(name)
        if table and set(table["columns"]) - set(required):
            warnings.append("UNKNOWN_COLUMN_PRESERVED")
            break
    return warnings


def _build_preview(tables_bytes):
    decoded, tables_by_name = _parse_tables(tables_bytes)
    source_sha256 = hashlib.sha256(tables_bytes).hexdigest()

    for name in REQUIRED_TABLE_COLUMNS:
        if name not in tables_by_name:
            _fail()

    _validate_meta(tables_by_name["meta"])
    history_ids_by_year = _validate_history(tables_by_name["history"])
    categories, category_ids = _validate_categories(tables_by_name["categories"])
    entries = _validate_working(
        tables_by_name["working"], category_ids, history_ids_by_year[SOURCE_HISTORY_YEAR]
    )
    _column_index(tables_by_name["audit"]["columns"], "audit")
    _column_index(tables_by_name["requests"]["columns"], "requests")
    _validate_auxiliary_ids(tables_by_name["audit"], True)
    _validate_auxiliary_ids(tables_by_name["requests"], False)

    return {
        "version": 1,
        "mode": "preview_only",
        "applyReady": False,
        "sourceSha256": source_sha256,
        "categories": categories,
        "entries": entries,
        "preservedTables": decoded,
        "warnings": _collect_warnings(tables_by_name),
        "blockers": list(BLOCKERS),
    }


def build_preview(tables_bytes):
    try:
        return _build_preview(tables_bytes)
    except Exception:
        raise ValueError(FAIL_ERROR) from None
