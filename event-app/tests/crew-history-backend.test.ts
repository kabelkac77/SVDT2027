import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
const uid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const source = {
  packageId: uid(4),
  sourceSha256: "a".repeat(64),
  sourceFormat: "crew-tables-v1",
  sourceRowId: "w1",
  sourceHistoryId: null,
  capturedBy: uid(1),
  capturedAt: "2026-11-28T12:00:00Z",
};
let fail = false;
let plainDenied = false;
const calls: { name: string; body: unknown }[] = [];
const server = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw),
    name = new URL(req.url!, "http://localhost").pathname.split("/").at(-1)!;
  calls.push({ name, body });
  res.setHeader("content-type", "application/json");
  if (fail) {
    res.statusCode = 403;
    if (plainDenied) {
      res.end("PRIVATE UNSTRUCTURED DENIAL");
      return;
    }
    res.end(JSON.stringify({ code: "42501", message: "PRIVATE RAW DETAILS" }));
    return;
  }
  if (name === "crew_transfer_history_index")
    res.end(
      JSON.stringify({
        version: 1,
        editionId: body.e,
        rosterId: body.r,
        sources: [source],
      }),
    );
  else {
    const { sourceRowId, sourceHistoryId, ...meta } = source;
    res.end(
      JSON.stringify({
        version: 1,
        editionId: body.e,
        rosterId: body.r,
        ...meta,
        sourceRow: {
          id: sourceRowId,
          year: "2027",
          source_id: sourceHistoryId,
          content: "original",
        },
        historyRow: null,
      }),
    );
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address() as { port: number };
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "synthetic-history-key";
const { loadCrewHistoryIndex, loadCrewHistoryRow } =
  await import("../src/lib/crew-backend");
after(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    }),
);
test("history adapter uses only exact read RPC scopes, never lists or writes private tables", async () => {
  calls.length = 0;
  assert.equal((await loadCrewHistoryIndex(uid(2), uid(3))).sources.length, 1);
  assert.equal(
    (await loadCrewHistoryRow(uid(2), uid(3), source)).historyRow,
    null,
  );
  assert.deepEqual(calls, [
    { name: "crew_transfer_history_index", body: { e: uid(2), r: uid(3) } },
    {
      name: "crew_transfer_history_row",
      body: { e: uid(2), r: uid(3), p_id: uid(4) },
    },
  ]);
});
test("RPC access denial is safe and never falls back to another endpoint", async () => {
  calls.length = 0;
  fail = true;
  try {
    await assert.rejects(
      () => loadCrewHistoryRow(uid(2), uid(3), source),
      (error) =>
        (error as any).kind === "denied" &&
        (error as Error).message === "CREW_HISTORY_READ_FAILED",
    );
    assert.equal(calls.length, 1);
  } finally {
    fail = false;
  }
});
test("invalid scoped identifiers fail before any network request", async () => {
  calls.length = 0;
  await assert.rejects(() => loadCrewHistoryIndex(uid(0), uid(3)));
  await assert.rejects(() =>
    loadCrewHistoryRow(uid(2), uid(3), {
      ...source,
      packageId: "other-source",
    }),
  );
  assert.equal(calls.length, 0);
});

test("an unstructured HTTP403 clears private state through the denied category too", async () => {
  fail = true;
  plainDenied = true;
  try {
    await assert.rejects(
      () => loadCrewHistoryIndex(uid(2), uid(3)),
      (error) => (error as any).kind === "denied",
    );
  } finally {
    fail = false;
    plainDenied = false;
  }
});
