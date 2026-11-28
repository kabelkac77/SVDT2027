/** Private, read-only history payloads. Never persist or infer identities. */
export type HistoryValue =
  | null
  | boolean
  | number
  | string
  | HistoryValue[]
  | { [key: string]: HistoryValue };
export type HistorySource = {
  packageId: string;
  sourceSha256: string;
  sourceFormat: string;
  sourceRowId: string;
  sourceHistoryId: string | null;
  capturedBy: string;
  capturedAt: string;
};
export type HistoryIndex = {
  version: 1;
  editionId: string;
  rosterId: string;
  sources: HistorySource[];
};
export type HistoryRow = Omit<
  HistorySource,
  "sourceRowId" | "sourceHistoryId"
> & {
  version: 1;
  editionId: string;
  rosterId: string;
  sourceRow: Record<string, HistoryValue>;
  historyRow: Record<string, HistoryValue> | null;
};
export type HistoryErrorKind = "denied" | "limit" | "unavailable" | "invalid";
export class CrewHistoryError extends Error {
  constructor(readonly kind: HistoryErrorKind) {
    super("CREW_HISTORY_READ_FAILED");
  }
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function historyUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 36 &&
    UUID.test(value) &&
    value !== "00000000-0000-0000-0000-000000000000"
  );
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new CrewHistoryError("invalid");
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  requireValue(
    Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key)),
  );
}
const META = [
  "packageId",
  "sourceSha256",
  "sourceFormat",
  "capturedBy",
  "capturedAt",
];
function metadata(value: Record<string, unknown>) {
  requireValue(historyUuid(value.packageId) && historyUuid(value.capturedBy));
  requireValue(
    typeof value.sourceSha256 === "string" &&
      value.sourceSha256.length === 64 &&
      /^[0-9a-f]{64}$/.test(value.sourceSha256),
  );
  requireValue(
    text(value.sourceFormat) &&
      text(value.capturedAt) &&
      Number.isFinite(Date.parse(value.capturedAt)),
  );
}
function scope(
  value: Record<string, unknown>,
  editionId: string,
  rosterId: string,
) {
  requireValue(historyUuid(editionId) && historyUuid(rosterId));
  requireValue(
    value.version === 1 &&
      value.editionId === editionId &&
      value.rosterId === rosterId,
  );
}
export function parseHistoryIndex(
  value: unknown,
  editionId: string,
  rosterId: string,
): HistoryIndex {
  requireValue(record(value));
  exactKeys(value, ["version", "editionId", "rosterId", "sources"]);
  scope(value, editionId, rosterId);
  requireValue(Array.isArray(value.sources));
  if (value.sources.length > 1000) throw new CrewHistoryError("limit");
  const seen = new Set<string>();
  for (const source of value.sources) {
    requireValue(record(source));
    exactKeys(source, [...META, "sourceRowId", "sourceHistoryId"]);
    metadata(source);
    requireValue(
      text(source.sourceRowId) &&
        (source.sourceHistoryId === null || text(source.sourceHistoryId)),
    );
    requireValue(!seen.has(source.packageId as string));
    seen.add(source.packageId as string);
  }
  return value as HistoryIndex;
}
function jsonValue(value: unknown, depth = 0): boolean {
  if (depth > 100) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value))
    return value.every((item) => jsonValue(item, depth + 1));
  return (
    record(value) &&
    Object.values(value).every((item) => jsonValue(item, depth + 1))
  );
}
export function parseHistoryRow(
  value: unknown,
  editionId: string,
  rosterId: string,
  source: HistorySource,
): HistoryRow {
  requireValue(record(value));
  exactKeys(value, [
    ...META,
    "version",
    "editionId",
    "rosterId",
    "sourceRow",
    "historyRow",
  ]);
  scope(value, editionId, rosterId);
  metadata(value);
  requireValue(
    META.every((key) => value[key] === source[key as keyof HistorySource]),
  );
  requireValue(record(value.sourceRow) && jsonValue(value.sourceRow));
  requireValue(
    value.sourceRow.id === source.sourceRowId &&
      value.sourceRow.year === "2027",
  );
  requireValue(
    Object.hasOwn(value.sourceRow, "source_id") &&
      value.sourceRow.source_id === source.sourceHistoryId,
  );
  if (source.sourceHistoryId === null) requireValue(value.historyRow === null);
  else {
    requireValue(record(value.historyRow) && jsonValue(value.historyRow));
    requireValue(
      value.historyRow.id === source.sourceHistoryId &&
        value.historyRow.year === "2026",
    );
  }
  return value as HistoryRow;
}
export function historyError(error: unknown): CrewHistoryError {
  if (error instanceof CrewHistoryError) return error;
  const code = record(error) ? error.code : null;
  const message =
    record(error) && typeof error.message === "string" ? error.message : "";
  if (
    ["42501", "401", "403", "PGRST301", "PGRST303"].includes(String(code)) ||
    message === "CREW_HISTORY_ACCESS_DENIED"
  )
    return new CrewHistoryError("denied");
  if (code === "54000" || message === "CREW_HISTORY_LIMIT_EXCEEDED")
    return new CrewHistoryError("limit");
  return new CrewHistoryError("unavailable");
}
export function historyMessage(error: CrewHistoryError): string {
  if (error.kind === "denied")
    return "K původním podkladům teď nemáš přístup. Zobrazenou historii jsme zavřeli.";
  if (error.kind === "limit")
    return "Seznam obsahuje více než 1 000 podkladů. Nelze ho bezpečně zobrazit celý.";
  if (error.kind === "invalid")
    return "Podklad se nepodařilo bezpečně ověřit. Zkus ho načíst znovu.";
  return "Původní podklady teď nejsou dostupné. Zkus je načíst znovu.";
}
