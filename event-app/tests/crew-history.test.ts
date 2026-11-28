import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CrewHistoryError,
  historyError,
  historyMessage,
  parseHistoryIndex,
  parseHistoryRow,
} from "../src/lib/crew-history";
const uid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const source = {
  packageId: uid(4),
  sourceSha256: "a".repeat(64),
  sourceFormat: "crew-tables-v1",
  sourceRowId: "w1",
  sourceHistoryId: "h1" as string | null,
  capturedBy: uid(1),
  capturedAt: "2026-11-28T12:00:00Z",
};
function index() {
  return {
    version: 1,
    editionId: uid(2),
    rosterId: uid(3),
    sources: [{ ...source }],
  };
}
function row(): any {
  const { sourceRowId, sourceHistoryId, ...meta } = source;
  return {
    ...meta,
    version: 1,
    editionId: uid(2),
    rosterId: uid(3),
    sourceRow: {
      id: sourceRowId,
      year: "2027",
      source_id: sourceHistoryId,
      content: "  původní\n text  ",
      unknown: null,
      zero: 0,
      flag: false,
      blob: { type: "blob", base64: "AP8=" },
    },
    historyRow: { id: "h1", year: "2026", content: "original" },
  };
}
test("history preserves exact source text/unknown JSON columns and null/zero/false without mutations", () => {
  const value = row(),
    before = structuredClone(value);
  assert.deepEqual(parseHistoryRow(value, uid(2), uid(3), source), before);
  assert.deepEqual(value, before);
  assert.deepEqual(parseHistoryIndex(index(), uid(2), uid(3)).sources, [
    source,
  ]);
});
test("metadata rejects incomplete, duplicate, foreign or oversized source lists", () => {
  for (const mutate of [
    (v: any) => v.sources.push(v.sources[0]),
    (v: any) => (v.editionId = uid(9)),
    (v: any) => (v.sources[0].packageId = uid(0)),
    (v: any) => delete v.sources[0].sourceHistoryId,
    (v: any) => (v.sources[0].sourceSha256 += "\n"),
    (v: any) => (v.sources[0].capturedAt = "private-invalid"),
    (v: any) => (v.sources = Array.from({ length: 1001 }, () => source)),
  ]) {
    const value = index();
    mutate(value);
    assert.throws(
      () => parseHistoryIndex(value, uid(2), uid(3)),
      CrewHistoryError,
    );
  }
});
test("row response is bound to every selected metadata field and actual original year/IDs", () => {
  for (const mutate of [
    (v: any) => (v.rosterId = uid(8)),
    (v: any) => (v.packageId = uid(8)),
    (v: any) => (v.sourceSha256 = "b".repeat(64)),
    (v: any) => (v.sourceFormat = "other"),
    (v: any) => (v.capturedBy = uid(8)),
    (v: any) => (v.capturedAt = "2026-11-27T12:00:00Z"),
    (v: any) => (v.sourceRow.source_id = "h2"),
    (v: any) => (v.sourceRow.year = 2027),
    (v: any) => (v.historyRow.year = "2025"),
    (v: any) => (v.historyRow = null),
    (v: any) => (v.sourceRow.extra = Infinity),
  ]) {
    const value = row();
    mutate(value);
    assert.throws(
      () => parseHistoryRow(value, uid(2), uid(3), source),
      CrewHistoryError,
    );
  }
});
test("an explicit null historic link is distinct from missing evidence and never infers2025", () => {
  const selected = { ...source, sourceHistoryId: null },
    value = row();
  value.sourceRow.source_id = null;
  value.historyRow = null;
  assert.equal(
    parseHistoryRow(value, uid(2), uid(3), selected).historyRow,
    null,
  );
  delete value.sourceRow.source_id;
  assert.throws(
    () => parseHistoryRow(value, uid(2), uid(3), selected),
    CrewHistoryError,
  );
});
test("safe error categories never echo private RPC message details", () => {
  for (const [code, kind] of [
    ["42501", "denied"],
    ["54000", "limit"],
    ["PGRST202", "unavailable"],
    ["503", "unavailable"],
  ]) {
    const error = historyError({ code, message: "PRIVATE PERSON/CASH" });
    assert.equal(error.kind, kind);
    assert.ok(!historyMessage(error).includes("PRIVATE"));
    assert.equal(error.message, "CREW_HISTORY_READ_FAILED");
  }
});
