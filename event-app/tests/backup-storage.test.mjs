import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { collectStorage } from "../tools/backup-storage.js";
const reject = (fn) =>
  assert.rejects(fn, (e) => e.message === "BACKUP_STORAGE_FAILED");
const sha = (b) => createHash("sha256").update(b).digest("hex");
function fixture(options = {}) {
  const calls = { buckets: [], lists: [], downloads: [] };
  const defaultObjects = [
    {
      key: "folder/file.txt",
      id: "object-1",
      updated_at: "2026-11-02T00:00:00Z",
      bytes: Buffer.from("bytes"),
    },
  ];
  let objects = (options.objects || defaultObjects).map((o) => ({ ...o }));
  const buckets = options.buckets || [
    { id: "crew", name: "crew", public: false, type: "STANDARD" },
  ];
  const inventory = options.inventory || {
    complete: true,
    buckets: buckets.map((b) => ({
      id: b.id,
      objects: objects
        .filter((o) => (o.bucket || "crew") === b.id)
        .map((o) => ({
          key: o.key,
          id: o.id,
          updated_at: o.updated_at,
          size: o.bytes.length,
          ...(o.expectedSha ? { sha256: o.expectedSha } : {}),
        })),
    })),
  };
  const storage = {
    async listBuckets(query = {}) {
      calls.buckets.push(query);
      if (options.bucketError)
        return { data: null, error: Error("PRIVATE-BUCKET-ERROR") };
      const rows = options.hiddenBucket ? [] : buckets;
      return {
        data: rows.slice(
          query.offset || 0,
          (query.offset || 0) + (query.limit || 1000),
        ),
        error: null,
      };
    },
    from(bucket) {
      return {
        async listV2(query) {
          calls.lists.push({ bucket, ...query });
          if (options.listError) throw Error("PRIVATE-LIST-ERROR");
          let rows = options.hiddenObjects
            ? []
            : objects.filter((o) => (o.bucket || "crew") === bucket);
          const offset = query.cursor ? Number(query.cursor) : 0;
          const page = rows.slice(offset, offset + 1000).map((o) => ({
            id: o.id,
            key: o.key,
            name: o.key,
            updated_at: o.updated_at,
            metadata: {
              size: o.bytes.length,
              mimetype: "application/octet-stream",
            },
            ...options.objectExtra,
          }));
          const hasNext = options.forceLoop || offset + 1000 < rows.length;
          return {
            data: {
              hasNext,
              nextCursor: hasNext
                ? options.forceLoop
                  ? "loop"
                  : String(offset + 1000)
                : undefined,
              folders: options.folders || [],
              objects: page,
            },
            error: null,
          };
        },
        async download(key) {
          calls.downloads.push({ bucket, key });
          if (options.downloadError)
            return { data: null, error: Error("PRIVATE-DOWNLOAD-ERROR") };
          const obj = objects.find(
            (o) => (o.bucket || "crew") === bucket && o.key === key,
          );
          const blob = new Blob([options.corruptBytes || obj.bytes]);
          if (options.mutateAfter)
            objects = objects.map((o) => ({ ...o, updated_at: "changed" }));
          return { data: blob, error: null };
        },
      };
    },
  };
  return { storage, inventory, calls };
}
test("Storage exports exact private bytes and full manifest mapping with checksums", async () => {
  const f = fixture();
  const rows = await collectStorage(f);
  const object = rows.find((r) => r.path === "storage/objects/00000001.bin");
  assert.deepEqual(object.bytes, Buffer.from("bytes"));
  assert.equal(object.source, "storage");
  const meta = JSON.parse(
    rows.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.equal(meta.version, 1);
  assert.equal(meta.objects.length, 1);
  assert.equal(meta.objects[0].key, "folder/file.txt");
  assert.equal(meta.objects[0].sha256, sha(object.bytes));
  assert.equal(meta.objects[0].exportPath, object.path);
  assert.ok(f.calls.buckets.length >= 2);
  assert.equal(f.calls.downloads.length, 1);
});
test("missing complete authority cannot be replaced by an empty RLS response", async () => {
  for (const patch of [
    { complete: false, buckets: [] },
    null,
    { buckets: [] },
  ]) {
    const f = fixture();
    f.inventory = patch;
    await reject(() => collectStorage(f));
    assert.equal(f.calls.buckets.length, 0);
  }
  for (const options of [{ hiddenBucket: true }, { hiddenObjects: true }]) {
    const f = fixture(options);
    await reject(() => collectStorage(f));
    assert.equal(f.calls.downloads.length, 0);
  }
});
test("known empty Storage still returns its explicit inventory and rechecks the service", async () => {
  const f = fixture({ buckets: [], objects: [] });
  const rows = await collectStorage(f);
  assert.equal(rows.length, 1);
  const m = JSON.parse(rows[0].bytes);
  assert.equal(m.objects.length, 0);
  assert.equal(f.calls.downloads.length, 0);
  assert.ok(f.calls.buckets.length >= 2);
});
test("objects are fully paginated and listings are repeated after download", async () => {
  const objects = Array.from({ length: 1001 }, (_, i) => ({
    key: "item-" + String(i).padStart(4, "0"),
    id: "id-" + i,
    updated_at: "fixed",
    bytes: Buffer.alloc(0),
  }));
  const f = fixture({ objects });
  const rows = await collectStorage(f);
  assert.equal(rows.length, 1002);
  assert.equal(f.calls.downloads.length, 1001);
  assert.ok(f.calls.lists.filter((c) => c.cursor === "1000").length >= 2);
  assert.ok(f.calls.lists.every((c) => c.with_delimiter === false));
});
test("bucket pagination is exhaustive even for buckets with zero files", async () => {
  const buckets = Array.from({ length: 1001 }, (_, i) => ({
    id: "bucket-" + String(i).padStart(4, "0"),
    public: false,
  }));
  const f = fixture({ buckets, objects: [] });
  const rows = await collectStorage(f);
  const m = JSON.parse(rows[0].bytes);
  assert.equal(m.buckets.length, 1001);
  assert.ok(f.calls.buckets.filter((q) => q.offset === 1000).length >= 2);
});
test("metadata changes during the read invalidate the whole source", async () => {
  const f = fixture({ mutateAfter: true });
  await reject(() => collectStorage(f));
});
test("download errors, incorrect sizes and mismatched supplied hashes fail without raw details", async () => {
  for (const options of [
    { bucketError: true },
    { listError: true },
    { downloadError: true },
    { corruptBytes: Buffer.from("too-long") },
    {
      objects: [
        {
          key: "file",
          id: "id",
          updated_at: "fixed",
          bytes: Buffer.from("x"),
          expectedSha: "0".repeat(64),
        },
      ],
    },
  ]) {
    const f = fixture(options);
    await reject(() => collectStorage(f));
  }
});
test("repeated cursors and unsupported folder listings cannot silently truncate a source", async () => {
  for (const options of [
    { forceLoop: true },
    { folders: [{ name: "hidden/" }] },
  ]) {
    const f = fixture(options);
    await reject(() => collectStorage(f));
    assert.equal(f.calls.downloads.length, 0);
  }
});
test("unsupported bucket kinds and versioned or deleted objects are rejected explicitly", async () => {
  for (const options of [
    { buckets: [{ id: "crew", type: "ANALYTICS" }] },
    { objectExtra: { is_versioned: true } },
    { objectExtra: { archived_at: "old" } },
    { objectExtra: { is_delete_marker: true } },
  ]) {
    const f = fixture(options);
    await reject(() => collectStorage(f));
    assert.equal(f.calls.downloads.length, 0);
  }
});
test("unsafe object keys and duplicate authority entries never cause network requests", async () => {
  for (const key of [
    "../escape",
    "/absolute",
    "a//b",
    "a/./b",
    "a\\b",
    "a/\u0000b",
  ]) {
    const f = fixture({
      objects: [{ key, id: "id", updated_at: "fixed", bytes: Buffer.alloc(0) }],
    });
    await reject(() => collectStorage(f));
    assert.equal(f.calls.buckets.length, 0);
  }
  const f = fixture();
  f.inventory.buckets[0].objects.push({ ...f.inventory.buckets[0].objects[0] });
  await reject(() => collectStorage(f));
  assert.equal(f.calls.buckets.length, 0);
});
test("case-distinct cloud keys retain independent exports in deterministic codepoint order", async () => {
  const objects = ["A", "a", "z", "á"].map((key, i) => ({
    key,
    id: "id-" + i,
    updated_at: "fixed",
    bytes: Buffer.from(key),
  }));
  const f = fixture({ objects });
  const rows = await collectStorage(f);
  const meta = JSON.parse(
    rows.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.deepEqual(
    meta.objects.map((o) => o.key),
    ["A", "a", "z", "á"],
  );
  assert.equal(new Set(meta.objects.map((o) => o.exportPath)).size, 4);
});

test("current version and bucket settings changing during download invalidate the source", async () => {
  const options = { objectExtra: { version: "v1" } };
  const f = fixture(options);
  const original = f.storage.from.bind(f.storage);
  f.storage.from = (b) => {
    const h = original(b);
    return {
      ...h,
      download: async (key) => {
        const value = await h.download(key);
        options.objectExtra.version = "v2";
        return value;
      },
    };
  };
  await reject(() => collectStorage(f));
  const g = fixture();
  const list = g.storage.listBuckets.bind(g.storage);
  g.storage.listBuckets = async (q) => {
    const value = await list(q);
    if (g.calls.downloads.length)
      value.data = value.data.map((b) => ({ ...b, public: true }));
    return value;
  };
  await reject(() => collectStorage(g));
});
test("authority is copied before asynchronous service code can mutate caller references", async () => {
  const f = fixture();
  const list = f.storage.listBuckets.bind(f.storage);
  f.storage.listBuckets = async (q) => {
    const value = await list(q);
    f.inventory.buckets[0].objects[0].key = "mutated-after-validation";
    return value;
  };
  const rows = await collectStorage(f);
  const meta = JSON.parse(
    rows.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.equal(meta.objects[0].key, "folder/file.txt");
});
test("malformed Blob responses and thrown private errors become only the public failure code", async () => {
  for (const data of [
    { size: 5, arrayBuffer: async () => Buffer.from("bytes") },
    null,
    "bytes",
  ]) {
    const f = fixture();
    const from = f.storage.from.bind(f.storage);
    f.storage.from = (b) => ({
      ...from(b),
      download: async () => ({ data, error: null }),
    });
    await reject(() => collectStorage(f));
  }
  const f = fixture();
  const from = f.storage.from.bind(f.storage);
  f.storage.from = (b) => ({
    ...from(b),
    download: async () => {
      throw Error("PRIVATE CONTACT AND TOKEN");
    },
  });
  await reject(() => collectStorage(f));
});
test("the manifest preserves current version and bucket restore settings but omits arbitrary service properties", async () => {
  const f = fixture({
    buckets: [
      {
        id: "crew",
        public: false,
        allowed_mime_types: ["image/png"],
        file_size_limit: 1000,
        versioning_status: "DISABLED",
        private_unknown: "DO NOT COPY",
      },
    ],
    objectExtra: { version: "v-current", private_unknown: "DO NOT COPY" },
  });
  const rows = await collectStorage(f);
  const meta = JSON.parse(
    rows.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.equal(meta.objects[0].version, "v-current");
  assert.equal(meta.buckets[0].metadata.public, false);
  assert.deepEqual(meta.buckets[0].metadata.allowed_mime_types, ["image/png"]);
  assert.equal(meta.buckets[0].metadata.file_size_limit, 1000);
  assert.ok(!JSON.stringify(meta).includes("DO NOT COPY"));
});
test("object and bucket names matching JavaScript prototype properties remain ordinary distinct cloud keys", async () => {
  const f = fixture({
    buckets: [{ id: "__proto__", public: false }],
    objects: [
      {
        bucket: "__proto__",
        key: "constructor",
        id: "id",
        updated_at: "fixed",
        bytes: Buffer.from("x"),
      },
    ],
  });
  const rows = await collectStorage(f);
  const meta = JSON.parse(
    rows.find((r) => r.path === "storage/inventory.json").bytes,
  );
  assert.equal(meta.objects[0].bucket, "__proto__");
  assert.equal(meta.objects[0].key, "constructor");
  assert.deepEqual(
    rows.find((r) => r.path === "storage/objects/00000001.bin").bytes,
    Buffer.from("x"),
  );
});

test("invalid top-level arguments always return the public error code", async () => {
  for (const arg of [undefined, null, [], 0, {}])
    await reject(() => collectStorage(arg));
});
test("declared authoritative bucket settings are checked before any download", async () => {
  const f = fixture();
  f.inventory.buckets[0].metadata = { public: true };
  await reject(() => collectStorage(f));
  assert.equal(f.calls.downloads.length, 0);
});
test("downloaded bytes are independent of SDK-owned ArrayBuffer after the hash is computed", async () => {
  const f = fixture();
  const shared = new Uint8Array(Buffer.from("bytes"));
  class MutableSdkBlob extends Blob {
    async arrayBuffer() {
      return shared.buffer;
    }
  }
  const from = f.storage.from.bind(f.storage);
  f.storage.from = (b) => ({
    ...from(b),
    download: async () => ({
      data: new MutableSdkBlob(["bytes"]),
      error: null,
    }),
  });
  const list = f.storage.listBuckets.bind(f.storage);
  let reads = 0;
  f.storage.listBuckets = async (q) => {
    const value = await list(q);
    if (++reads > 1) shared.fill(0);
    return value;
  };
  const rows = await collectStorage(f);
  assert.deepEqual(
    rows.find((r) => r.path === "storage/objects/00000001.bin").bytes,
    Buffer.from("bytes"),
  );
});
