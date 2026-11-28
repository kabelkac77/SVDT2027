"""Pure structural validation of a crew import plan against its exact source bytes.

This reader does not authenticate a target fingerprint or authorize an import.
"""

import json
import re

from crew_import_preview import build_preview

_ERROR = "CREW_IMPORT_VERIFY_FAILED"
_MAX_BYTES = 16 * 1024 * 1024
_MAX_OPERATIONS = 10000
_MAX_VERSION = 2147483647
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_HASH = re.compile(r"[0-9a-f]{64}")
_NIL = "00000000-0000-0000-0000-000000000000"
_TOP = {"version", "editionId", "sourceSha256", "targetFingerprint", "categories", "entries"}
_CATEGORY = {"sourceCategoryId", "targetCategoryId", "action", "expectedVersion"}
_ENTRY = {
    "sourceRowId", "targetRosterId", "action", "expectedVersion",
    "compensationAction", "expectedCompensationVersion", "kind", "personId", "linkedUserId",
}


def _require(condition):
    if not condition:
        raise ValueError(_ERROR)


def _object(pairs):
    result = {}
    for key, value in pairs:
        _require(key not in result)
        result[key] = value
    return result


def _reject_number(_value):
    raise ValueError(_ERROR)


def _unicode(value):
    # JSON escapes can introduce lone surrogates even when the input text is UTF8.
    if isinstance(value, str):
        value.encode("utf-8")
    elif isinstance(value, dict):
        for key, child in value.items():
            key.encode("utf-8")
            _unicode(child)
    elif isinstance(value, list):
        for child in value:
            _unicode(child)


def _shape(value, keys):
    _require(type(value) is dict and value.keys() == keys)


def _uuid(value):
    return type(value) is str and _UUID.fullmatch(value) is not None and value != _NIL


def _hash(value):
    return type(value) is str and _HASH.fullmatch(value) is not None


def _source_id(value, limit):
    return type(value) is str and 0 < len(value) <= limit


def _operation(action, version):
    _require(type(action) is str and action in ("create", "keep"))
    _require(type(version) is int and 0 <= version <= _MAX_VERSION)
    _require(version == 0 if action == "create" else version > 0)


def _coverage(operations, preview_rows, source_key, target_key, fields, limit):
    _require(type(operations) is list and len(operations) <= _MAX_OPERATIONS)
    expected = {row[source_key] for row in preview_rows}
    seen_sources = set()
    seen_targets = set()
    for row in operations:
        _shape(row, fields)
        source, target = row[source_key], row[target_key]
        _require(_source_id(source, limit) and source in expected and source not in seen_sources)
        _require(_uuid(target) and target not in seen_targets)
        _operation(row["action"], row["expectedVersion"])
        seen_sources.add(source)
        seen_targets.add(target)
    _require(seen_sources == expected)


def parse_import_plan(tables_bytes, plan_text):
    """Return the unchanged decoded plan and a private, non-applicable source preview.

    Invalid inputs have one constant, unchained error. Unexpected OS failures are
    allowed to propagate; no I/O is performed by this helper.
    """
    try:
        _require(type(tables_bytes) is bytes and type(plan_text) is str)
        _require(len(plan_text) <= _MAX_BYTES)
        _require(len(plan_text.encode("utf-8")) <= _MAX_BYTES)
        plan = json.loads(
            plan_text, object_pairs_hook=_object,
            parse_constant=_reject_number, parse_float=_reject_number,
        )
        _unicode(plan)
        _shape(plan, _TOP)
        _require(type(plan["version"]) is int and plan["version"] == 1)
        _require(_uuid(plan["editionId"]))
        _require(_hash(plan["sourceSha256"]) and _hash(plan["targetFingerprint"]))
        preview = build_preview(tables_bytes)
        _require(plan["sourceSha256"] == preview["sourceSha256"])
        _coverage(plan["categories"], preview["categories"], "sourceCategoryId",
                  "targetCategoryId", _CATEGORY, 100)
        _coverage(plan["entries"], preview["entries"], "sourceRowId",
                  "targetRosterId", _ENTRY, 200)
        for row in plan["entries"]:
            _operation(row["compensationAction"], row["expectedCompensationVersion"])
            _require(type(row["kind"]) is str and row["kind"] in ("person", "group", "unresolved"))
            if row["action"] == "create":
                _require(row["kind"] in ("group", "unresolved"))
                _require(row["personId"] is None and row["linkedUserId"] is None)
                _require(row["compensationAction"] == "create")
            else:
                _require(_uuid(row["personId"]) if row["kind"] == "person" else row["personId"] is None)
                _require(row["linkedUserId"] is None or _uuid(row["linkedUserId"]))
        return plan, preview
    except (ValueError, TypeError, OverflowError, RecursionError):
        raise ValueError(_ERROR) from None
