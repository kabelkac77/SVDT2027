"""Pure comparison of supplied crew import artifacts; never authorizes cutover."""

import hashlib
import json
import re

from crew_import_plan import build_import_plan
from crew_import_verify_plan import parse_import_plan
from crew_transfer_reconcile import reconcile_preview

_ERROR = "CREW_IMPORT_VERIFY_FAILED"
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_HASH = re.compile(r"[0-9a-f]{64}")
_NIL = "00000000-0000-0000-0000-000000000000"
_GATES = {"LIVE_AUTHORITY_REVIEW_REQUIRED", "MANUAL_CUTOVER_APPROVAL_REQUIRED",
          "VERIFIED_BACKUP_AND_RESTORE_REQUIRED"}
_COUNTS = {"createdCategories", "keptCategories", "createdEntries", "keptEntries",
           "createdCompensations", "keptCompensations", "sourceRows"}
_RECEIPT = _COUNTS | {"version", "editionId", "approvalId", "requestId", "packageId",
                      "sourceSha256", "planSha256"}


def _require(condition):
    if not condition:
        raise ValueError(_ERROR)


def _uuid(value):
    return type(value) is str and _UUID.fullmatch(value) is not None and value != _NIL


def _hash(value):
    return type(value) is str and _HASH.fullmatch(value) is not None


def _json_types(value):
    # Supplied export objects must be JSON data, never hooks or coerced keys.
    if type(value) is dict:
        for key, child in value.items():
            _require(type(key) is str)
            _json_types(child)
    elif type(value) is list:
        for child in value:
            _json_types(child)
    else:
        _require(value is None or type(value) in (str, bool, int, float))


def _canonical(value):
    _json_types(value)
    text = json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False,
                      separators=(",", ":"))
    text.encode("utf-8")
    return text


def _target(raw, target, edition_id, blockers):
    _canonical(target)
    reconcile_preview(raw, None, target)
    _require(target["edition"]["id"] == edition_id)
    _require(_hash(target.get("targetFingerprint")))
    for row in target["categories"]:
        _require("required_count" in row and "required_term" in row)
        count, term = row["required_count"], row["required_term"]
        _require(count is None or type(count) is int and 0 <= count <= 10000)
        _require(type(term) is str and len(term) <= 1000)
    for link in target["sourceLinks"]:
        _require("source_history_id" in link)
        history = link["source_history_id"]
        _require(history is None or type(history) is str)
    if not target["provenanceReady"]:
        blockers.add("PRIVATE_PROVENANCE_SCHEMA_REQUIRED")
    if target["edition"]["archived"]:
        blockers.add("TARGET_ARCHIVED")


def _receipt(receipt):
    _canonical(receipt)
    _require(type(receipt) is dict and receipt.keys() == _RECEIPT)
    _require(type(receipt["version"]) is int and receipt["version"] == 1)
    for field in ("editionId", "approvalId", "requestId", "packageId"):
        _require(_uuid(receipt[field]))
    for field in ("sourceSha256", "planSha256"):
        _require(_hash(receipt[field]))
    for field in _COUNTS:
        _require(type(receipt[field]) is int and 0 <= receipt[field] <= 10000)


def _mapping(plan):
    mapping = {"editionId": plan["editionId"], "categories": {}, "entries": {}}
    for row in plan["categories"]:
        mapping["categories"][row["sourceCategoryId"]] = {
            "id": row["targetCategoryId"], "action": row["action"],
        }
    for row in plan["entries"]:
        item = {"id": row["targetRosterId"], "action": row["action"],
                "compensationAction": row["compensationAction"]}
        if row["action"] == "create":
            item["kind"] = row["kind"]
        mapping["entries"][row["sourceRowId"]] = item
    return mapping


def _index(rows, key):
    return {row[key]: row for row in rows}


def _compare_rows(plan, preview, before, after, add):
    categories = _index(preview["categories"], "sourceCategoryId")
    entries = _index(preview["entries"], "sourceRowId")
    previous_categories = _index(before["categories"], "id")
    current_categories = _index(after["categories"], "id")
    current_entries = _index(after["entries"], "id")
    current_compensation = _index(after["compensation"], "roster_id")

    def compare(scope, identifier, expected, actual):
        if actual is None:
            add(scope, identifier, ["missing"])
        else:
            fields = [key for key, value in expected.items()
                      if key not in actual or _canonical(actual[key]) != _canonical(value)]
            add(scope, identifier, fields)

    for operation in plan["categories"]:
        identifier = operation["targetCategoryId"]
        source = categories[operation["sourceCategoryId"]]
        kept = operation["action"] == "keep"
        previous = previous_categories.get(identifier, {})
        expected = {"name": source["name"], "color": source["color"],
                    "version": operation["expectedVersion"] if kept else 1,
                    "required_count": previous.get("required_count") if kept else None,
                    "required_term": previous["required_term"] if kept else ""}
        compare("category", identifier, expected, current_categories.get(identifier))
    category_ids = {row["sourceCategoryId"]: row["targetCategoryId"] for row in plan["categories"]}
    for operation in plan["entries"]:
        identifier = operation["targetRosterId"]
        source = entries[operation["sourceRowId"]]
        expected = dict(source["roster"], category_id=category_ids[source["sourceCategoryId"]],
                        kind=operation["kind"], person_id=operation["personId"],
                        linked_user_id=operation["linkedUserId"],
                        version=1 if operation["action"] == "create" else operation["expectedVersion"])
        compare("roster", identifier, expected, current_entries.get(identifier))
        expected_compensation = dict(source["compensation"], version=(
            1 if operation["compensationAction"] == "create" else operation["expectedCompensationVersion"]))
        compare("compensation", identifier, expected_compensation, current_compensation.get(identifier))

    # The importer only inserts; every pre-existing row (including kept rows and
    # unknown metadata) must survive byte-equivalent JSON values and JSON types.
    for table, key, operations, target_key, action in (
        ("categories", "id", plan["categories"], "targetCategoryId", "action"),
        ("entries", "id", plan["entries"], "targetRosterId", "action"),
        ("compensation", "roster_id", plan["entries"], "targetRosterId", "compensationAction"),
    ):
        old, new = _index(before[table], key), _index(after[table], key)
        created = {row[target_key] for row in operations if row[action] == "create"}
        if set(new) != set(old) | created:
            add("target", "snapshot", [table + ".ids"])
        if any(identifier not in new or _canonical(row) != _canonical(new[identifier])
               for identifier, row in old.items()):
            add("target", "snapshot", ["unmapped." + table])


def _compare_provenance(plan, preview, before, after, receipt, add):
    old = _index(before["sourcePackages"], "id")
    new = _index(after["sourcePackages"], "id")
    added = set(new) - set(old)
    matches = [row for row in after["sourcePackages"] if row["source_sha256"] == plan["sourceSha256"]]
    if len(matches) != 1 or matches[0]["id"] not in added or len(added) != 1:
        add("provenance", "snapshot", ["package"])
    if set(old) - set(new) or any(identifier not in new or _canonical(row) != _canonical(new[identifier])
                                 for identifier, row in old.items()):
        add("provenance", "snapshot", ["previous_packages"])
    if receipt is not None and (len(matches) != 1 or matches[0]["id"] != receipt["packageId"]):
        add("provenance", "snapshot", ["package_id"])
    old_links = sorted(_canonical(row) for row in before["sourceLinks"])
    retained_links = sorted(_canonical(row) for row in after["sourceLinks"] if row["package_id"] in old)
    if old_links != retained_links:
        add("provenance", "snapshot", ["previous_links"])
    if len(matches) != 1:
        return
    package_id = matches[0]["id"]
    links = {row["source_row_id"]: row for row in after["sourceLinks"] if row["package_id"] == package_id}
    expected = _index(plan["entries"], "sourceRowId")
    source = _index(preview["entries"], "sourceRowId")
    if set(links) != set(expected):
        add("provenance", "snapshot", ["links.coverage"])
    for identifier in sorted(set(links) & set(expected)):
        fields = []
        if links[identifier]["roster_id"] != expected[identifier]["targetRosterId"]:
            fields.append("roster_id")
        if links[identifier]["source_history_id"] != source[identifier]["sourceId"]:
            fields.append("source_history_id")
        add("provenance", identifier, fields)


def verify_import(tables_bytes, plan_text, before=None, after=None, receipt=None, stored_source_text=None):
    """Compare supplied artifacts without I/O, mutation, or authority claims."""
    try:
        plan, preview = parse_import_plan(tables_bytes, plan_text)
        plan_sha = hashlib.sha256(plan_text.encode("utf-8")).hexdigest()
        blockers = set(_GATES)
        findings = {}

        def add(scope, identifier, fields):
            if fields:
                findings.setdefault((scope, identifier), set()).update(fields)

        for value, missing in ((before, "BEFORE_EXPORT_REQUIRED"), (after, "AFTER_EXPORT_REQUIRED")):
            if value is None:
                blockers.add(missing)
            else:
                _target(tables_bytes, value, plan["editionId"], blockers)
        if stored_source_text is None:
            blockers.add("SOURCE_PAYLOAD_READBACK_REQUIRED")
        else:
            _require(type(stored_source_text) is str and len(stored_source_text) <= 128 * 1024 * 1024)
            stored = stored_source_text.encode("utf-8")
            _require(len(stored) <= 128 * 1024 * 1024)
            if stored != tables_bytes:
                add("source", "source", ["stored_source_bytes"])
                blockers.add("SOURCE_PAYLOAD_MISMATCH")
        if receipt is None:
            blockers.add("IMPORT_RECEIPT_REQUIRED")
        else:
            _receipt(receipt)
            expected = {"editionId": plan["editionId"], "sourceSha256": plan["sourceSha256"],
                        "planSha256": plan_sha, "sourceRows": len(plan["entries"])}
            for field, operations, action, value in (
                ("createdCategories", plan["categories"], "action", "create"),
                ("keptCategories", plan["categories"], "action", "keep"),
                ("createdEntries", plan["entries"], "action", "create"),
                ("keptEntries", plan["entries"], "action", "keep"),
                ("createdCompensations", plan["entries"], "compensationAction", "create"),
                ("keptCompensations", plan["entries"], "compensationAction", "keep"),
            ):
                expected[field] = sum(row[action] == value for row in operations)
            mismatches = [field for field, value in expected.items() if receipt[field] != value]
            if mismatches:
                add("receipt", "receipt", mismatches)
                blockers.add("RECEIPT_MISMATCH")
        approved_plan = False
        if before is not None:
            # A structurally valid snapshot can still make the approved plan
            # impossible (for example a newer keep version outside plan range).
            try:
                rebuilt = build_import_plan(tables_bytes, _mapping(plan), before)["planText"]
            except ValueError:
                rebuilt = None
            approved_plan = rebuilt is not None and _canonical(json.loads(rebuilt)) == _canonical(plan)
            if not approved_plan:
                add("target", "snapshot", ["approved_plan"])
                blockers.add("BEFORE_PLAN_MISMATCH")
        if approved_plan and after is not None:
            _compare_rows(plan, preview, before, after, add)
            _compare_provenance(plan, preview, before, after, receipt, add)
            if any(scope in ("category", "roster", "compensation", "provenance", "target")
                   for scope, _ in findings):
                blockers.add("IMPORT_DIFFERENCES_PRESENT")
        result_findings = [{"scope": scope, "id": identifier, "fields": sorted(fields)}
                           for (scope, identifier), fields in sorted(findings.items())]
        return {"version": 1, "mode": "post_import_verification", "applyReady": False,
                "cutoverReady": False, "authorityVerified": False,
                "comparisonMatches": not findings and blockers == _GATES,
                "sourceSha256": plan["sourceSha256"], "planSha256": plan_sha,
                "editionId": plan["editionId"],
                "counts": {"categories": len(plan["categories"]), "entries": len(plan["entries"]),
                           "findings": len(result_findings)},
                "findings": result_findings, "blockers": sorted(blockers)}
    except (ValueError, TypeError, KeyError, OverflowError, RecursionError):
        raise ValueError(_ERROR) from None
