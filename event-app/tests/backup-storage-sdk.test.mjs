import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { collectStorage } from "../tools/backup-storage.js";
function fixture(mode = "ok") {
  const bytes = Buffer.from([0, 255, 1]),
    key = "folder/Český soubor.png",
    calls = [];
  const storage = createClient(
    "https://storage-fixture.invalid",
    "synthetic-placeholder-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async (input, init = {}) => {
          const url = new URL(
            typeof input === "string" ? input : input.url || String(input),
          );
          assert.equal(url.hostname, "storage-fixture.invalid");
          const path = decodeURIComponent(url.pathname);
          calls.push({
            path,
            method: init.method || "GET",
            query: url.searchParams,
            body: init.body ? JSON.parse(init.body) : null,
          });
          const json = (value, status = 200) =>
            new Response(JSON.stringify(value), {
              status,
              headers: { "content-type": "application/json" },
            });
          if (mode === "denied")
            return json(
              {
                message: "PRIVATE SERVER ERROR",
                statusCode: "403",
                error: "AccessDenied",
              },
              403,
            );
          if (path === "/storage/v1/bucket")
            return json(
              mode === "hidden"
                ? []
                : [
                    {
                      id: "crew",
                      name: "crew",
                      public: false,
                      type: "STANDARD",
                      versioning_status: "DISABLED",
                      allowed_mime_types: ["image/png"],
                      file_size_limit: 4096,
                    },
                  ],
            );
          if (path === "/storage/v1/object/list-v2/crew")
            return json({
              hasNext: false,
              folders: [],
              objects: [
                {
                  id: "object-1",
                  name: key,
                  key,
                  updated_at: "fixed",
                  version: "current",
                  metadata: { size: bytes.length },
                },
              ],
            });
          if (
            path === "/storage/v1/object/authenticated/crew/" + key ||
            path === "/storage/v1/object/crew/" + key
          )
            return new Response(bytes, {
              headers: { "content-type": "image/png" },
            });
          throw Error("UNEXPECTED FIXTURE ROUTE");
        },
      },
    },
  ).storage;
  return {
    storage,
    inventory: {
      complete: true,
      buckets: [
        {
          id: "crew",
          objects: [
            { key, id: "object-1", updated_at: "fixed", size: bytes.length },
          ],
        },
      ],
    },
    calls,
    bytes,
  };
}
test("installed Supabase SDK routes bucket listV2 and binary download into the actual collector with mocked fetch only", async () => {
  const f = fixture(),
    files = await collectStorage(f);
  assert.deepEqual(
    files.find((r) => r.path === "storage/objects/00000001.bin").bytes,
    f.bytes,
  );
  const manifest = JSON.parse(
    files.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.equal(manifest.objects[0].key, "folder/Český soubor.png");
  assert.equal(manifest.objects[0].version, "current");
  assert.equal(manifest.buckets[0].metadata.public, false);
  const buckets = f.calls.filter((c) => c.path === "/storage/v1/bucket");
  assert.equal(buckets.length, 2);
  assert.equal(buckets[0].query.get("limit"), "1000");
  const lists = f.calls.filter(
    (c) => c.path === "/storage/v1/object/list-v2/crew",
  );
  assert.equal(lists.length, 2);
  assert.equal(lists[0].body.with_delimiter, false);
  assert.equal(lists[0].body.prefix, "");
  assert.equal(f.calls.length, 5);
});
test("an actual SDK empty RLS-limited response cannot replace the independent authority", async () => {
  const f = fixture("hidden");
  await assert.rejects(
    () => collectStorage(f),
    (e) => e.message === "BACKUP_STORAGE_FAILED",
  );
  assert.equal(f.calls.length, 1);
});
test("actual SDK HTTP failures produce only the constant collector error", async () => {
  const f = fixture("denied");
  await assert.rejects(
    () => collectStorage(f),
    (e) => e.message === "BACKUP_STORAGE_FAILED",
  );
  assert.equal(f.calls.length, 1);
});
