import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateInventory,
  listStorageInventory,
} from "../tools/backup-storage-inventory.js";
const fail = (fn) =>
  assert.throws(fn, (e) => e.message === "BACKUP_STORAGE_FAILED");
const afail = (fn) =>
  assert.rejects(fn, (e) => e.message === "BACKUP_STORAGE_FAILED");
const object = (key = "file") => ({
  key,
  id: "id-" + key,
  updated_at: "fixed",
  size: 1,
});
const authority = (objects = [object()]) => ({
  complete: true,
  buckets: [{ id: "crew", objects }],
});
const clone = (x) => JSON.parse(JSON.stringify(x));
function fixture(options = {}) {
  const calls = { buckets: 0, objects: 0 };
  const buckets = options.buckets || [
    {
      id: "crew",
      public: false,
      allowed_mime_types: ["image/png"],
      file_size_limit: "1024",
      type: "STANDARD",
    },
  ];
  const objects = options.objects || [
    { id: "id-file", name: "file", updated_at: "fixed", metadata: { size: 1 } },
  ];
  const storage = {
    async listBuckets(q) {
      calls.buckets++;
      if (options.bucketError) throw Error("PRIVATE");
      return { data: buckets.slice(q.offset, q.offset + q.limit), error: null };
    },
    from() {
      return {
        async listV2(q) {
          calls.objects++;
          if (options.listError) return { error: Error("PRIVATE"), data: null };
          const offset = q.cursor ? Number(q.cursor) : 0;
          const rows = objects.slice(offset, offset + q.limit);
          const next = offset + q.limit < objects.length;
          return {
            error: null,
            data: {
              folders: [],
              objects: rows,
              hasNext: next,
              nextCursor: next ? String(offset + q.limit) : undefined,
              ...options.dataPatch,
            },
          };
        },
      };
    },
  };
  return { storage, calls };
}
test("authority validation returns stable deep copies and never manufactures complete authority from service data", () => {
  const input = authority([
    { ...object(), sha256: "a".repeat(64), version: "v1" },
  ]);
  const result = validateInventory(input);
  assert.equal(result.buckets[0].objects[0].sha256, "a".repeat(64));
  input.buckets[0].objects[0].key = "changed";
  assert.equal(result.buckets[0].objects[0].key, "file");
  assert.notEqual(result.buckets, input.buckets);
  assert.notEqual(result.buckets[0].objects, input.buckets[0].objects);
});
test("unknown or malformed authority and unsafe metadata are rejected", () => {
  for (const value of [
    null,
    {},
    { complete: 1, buckets: [] },
    { complete: false, buckets: [] },
    { complete: true, buckets: null },
    authority([{ ...object(), size: -1 }]),
    authority([{ ...object(), size: 1.5 }]),
    authority([{ ...object(), id: "" }]),
    authority([{ ...object(), updated_at: "\n" }]),
    authority([{ ...object(), sha256: "A".repeat(64) }]),
  ])
    fail(() => validateInventory(value));
});
test("unsafe paths and lone surrogates are never normalized to apparently safe keys", () => {
  for (const key of [
    "../x",
    "x/../z",
    "/x",
    "x//z",
    "x/./z",
    "x\\z",
    "x/\u007fz",
    "x/\u0000z",
    "x/\ud800",
    "x/" + "á".repeat(128),
    "a".repeat(1001),
  ])
    fail(() => validateInventory(authority([object(key)])));
  for (const id of ["..", "x/y", "/x", "x\\y", "x\u0000"]) {
    const a = authority();
    a.buckets[0].id = id;
    fail(() => validateInventory(a));
  }
});
test("duplicates are exact while case and Unicode distinct keys are retained in deterministic order", () => {
  for (const a of [
    authority([object(), object()]),
    {
      complete: true,
      buckets: [
        { id: "crew", objects: [] },
        { id: "crew", objects: [] },
      ],
    },
  ])
    fail(() => validateInventory(a));
  const result = validateInventory(authority(["á", "a", "A", "z"].map(object)));
  assert.deepEqual(
    result.buckets[0].objects.map((o) => o.key),
    ["A", "a", "z", "á"],
  );
});
test("authority limits count objects and bytes across buckets", () => {
  fail(() =>
    validateInventory(
      authority(Array.from({ length: 10000 }, (_, i) => object("f" + i))),
    ),
  );
  fail(() =>
    validateInventory(
      authority([{ ...object(), size: 128 * 1024 * 1024 + 1 }]),
    ),
  );
  fail(() =>
    validateInventory({
      complete: true,
      buckets: Array.from({ length: 10001 }, (_, i) => ({
        id: "b" + i,
        objects: [],
      })),
    }),
  );
});
test("list metadata is whitelisted and arrays do not alias the SDK response", async () => {
  const f = fixture();
  const result = await listStorageInventory(f.storage);
  assert.equal(result.complete, undefined);
  const b = result.buckets[0];
  assert.equal(b.id, "crew");
  assert.equal(b.metadata.public, false);
  assert.deepEqual(b.metadata.allowed_mime_types, ["image/png"]);
  assert.equal(b.objects[0].size, 1);
  assert.equal(b.type, undefined);
  assert.equal(f.calls.objects, 1);
});
test("bucket and object lists are fully paginated without using folder delimiters", async () => {
  const f = fixture({
    buckets: Array.from({ length: 1001 }, (_, i) => ({
      id: "b" + String(i).padStart(4, "0"),
    })),
    objects: [],
  });
  const r = await listStorageInventory(f.storage);
  assert.equal(r.buckets.length, 1001);
  assert.equal(f.calls.buckets, 2);
  const g = fixture({
    objects: Array.from({ length: 1001 }, (_, i) => ({
      id: "i" + i,
      key: "k" + i,
      name: "ignored",
      updated_at: "fixed",
      metadata: { size: 0 },
    })),
  });
  const rr = await listStorageInventory(g.storage);
  assert.equal(rr.buckets[0].objects.length, 1001);
  assert.equal(g.calls.objects, 2);
});
test("service and malformed responses never silently become an empty complete source", async () => {
  for (const options of [
    { bucketError: true },
    { listError: true },
    { dataPatch: { folders: [{ name: "hidden" }] } },
    { dataPatch: { hasNext: "true" } },
    { dataPatch: { objects: null } },
    { dataPatch: { hasNext: true, nextCursor: "" } },
    { dataPatch: { hasNext: true, nextCursor: "loop" } },
  ])
    await afail(() => listStorageInventory(fixture(options).storage));
  for (const storage of [
    null,
    {},
    { listBuckets: async () => ({ data: null, error: null }) },
  ])
    await afail(() => listStorageInventory(storage));
});
test("unsupported archives, versions and bucket kinds stop the list", async () => {
  for (const patch of [
    { type: "ANALYTICS" },
    { is_versioned: true },
    { archived_at: "old" },
    { is_delete_marker: true },
  ])
    await afail(() =>
      listStorageInventory(
        fixture({ buckets: [{ id: "crew", ...patch }] }).storage,
      ),
    );
  for (const patch of [
    { is_versioned: true },
    { archived_at: "old" },
    { is_delete_marker: true },
    { metadata: { size: null } },
    { version: "" },
  ])
    await afail(() =>
      listStorageInventory(
        fixture({
          objects: [
            {
              id: "id",
              name: "x",
              updated_at: "fixed",
              metadata: { size: 1 },
              ...patch,
            },
          ],
        }).storage,
      ),
    );
});
test("current object version is an identity and is preserved without enabling archived version backups", async () => {
  const f = fixture({
    objects: [
      {
        id: "id",
        key: "current",
        name: "other",
        updated_at: "fixed",
        metadata: { size: 0 },
        version: "current-v1",
      },
    ],
  });
  const r = await listStorageInventory(f.storage);
  assert.equal(r.buckets[0].objects[0].version, "current-v1");
  assert.equal(r.buckets[0].objects[0].key, "current");
});

test("SDK bucket versioning status cannot hide disabled-or-suspended version history", async () => {
  for (const status of ["ENABLED", "SUSPENDED", null, "future"])
    await afail(() =>
      listStorageInventory(
        fixture({ buckets: [{ id: "crew", versioning_status: status }] })
          .storage,
      ),
    );
  await listStorageInventory(
    fixture({
      buckets: [{ id: "crew", versioning_status: "DISABLED" }],
      objects: [],
    }).storage,
  );
});
test("object limits stop further pagination before downloading an oversized inventory", async () => {
  const f = fixture({
    objects: Array.from({ length: 20000 }, (_, i) => ({
      id: "i" + i,
      name: "k" + i,
      updated_at: "fixed",
      metadata: { size: 0 },
    })),
  });
  await afail(() => listStorageInventory(f.storage));
  assert.ok(f.calls.objects <= 10);
});
test("malformed bucket options and SDK getters never leak raw errors", async () => {
  for (const patch of [
    { public: "yes" },
    { file_size_limit: Infinity },
    { file_size_limit: -1 },
    { file_size_limit: "unbounded" },
    { allowed_mime_types: ["image/png", "\n"] },
  ])
    await afail(() =>
      listStorageInventory(
        fixture({ buckets: [{ id: "crew", ...patch }] }).storage,
      ),
    );
  await afail(() =>
    listStorageInventory({
      get listBuckets() {
        throw Error("PRIVATE");
      },
    }),
  );
});
