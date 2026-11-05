import { createHash } from "node:crypto";
import {
  validateInventory,
  listStorageInventory,
} from "./backup-storage-inventory.js";

const MAX_OBJECTS = 9999;
const MAX_TOTAL_SIZE = 128 * 1024 * 1024;
const MANIFEST_PATH = "storage/inventory.json";

function fail() {
  throw new Error("BACKUP_STORAGE_FAILED");
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined)
    return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

function compareAuthorityToNetwork(authority, network) {
  if (authority.buckets.length !== network.buckets.length) fail();
  for (let i = 0; i < authority.buckets.length; i++) {
    const authorityBucket = authority.buckets[i];
    const networkBucket = network.buckets[i];
    if (authorityBucket.id !== networkBucket.id) fail();
    if (authorityBucket.metadata !== undefined) {
      for (const key of Object.keys(authorityBucket.metadata)) {
        if (
          !deepEqual(
            authorityBucket.metadata[key],
            networkBucket.metadata?.[key],
          )
        )
          fail();
      }
    }
    if (authorityBucket.objects.length !== networkBucket.objects.length) fail();
    for (let j = 0; j < authorityBucket.objects.length; j++) {
      const authorityObject = authorityBucket.objects[j];
      const networkObject = networkBucket.objects[j];
      if (authorityObject.key !== networkObject.key) fail();
      if (authorityObject.id !== networkObject.id) fail();
      if (authorityObject.updated_at !== networkObject.updated_at) fail();
      if (authorityObject.size !== networkObject.size) fail();
      if (authorityObject.version !== undefined) {
        if (networkObject.version === undefined) fail();
        if (authorityObject.version !== networkObject.version) fail();
      }
    }
  }
}

function padIndex(index) {
  return String(index).padStart(8, "0");
}

export async function collectStorage(options) {
  try {
    const { storage, inventory } = options;
    const authority = validateInventory(inventory);
    const firstNetwork = await listStorageInventory(storage);
    compareAuthorityToNetwork(authority, firstNetwork);

    const files = [];
    const manifestObjects = [];
    let totalBytes = 0;
    let objectCount = 0;
    let index = 0;

    for (let bi = 0; bi < firstNetwork.buckets.length; bi++) {
      const bucket = firstNetwork.buckets[bi];
      const authorityBucket = authority.buckets[bi];
      const bucketHandle = storage.from(bucket.id);

      for (let oi = 0; oi < bucket.objects.length; oi++) {
        const object = bucket.objects[oi];
        const authorityObject = authorityBucket.objects[oi];

        objectCount++;
        if (objectCount > MAX_OBJECTS) fail();
        totalBytes += object.size;
        if (totalBytes > MAX_TOTAL_SIZE) fail();

        const result = await bucketHandle.download(object.key);
        if (!result || result.error !== null) fail();

        const blob = result.data;
        if (!(blob instanceof Blob)) fail();
        if (typeof blob.size !== "number" || blob.size !== object.size) fail();

        const arrayBuffer = await blob.arrayBuffer();
        if (!(arrayBuffer instanceof ArrayBuffer)) fail();
        if (arrayBuffer.byteLength !== object.size) fail();

        const bytes = Buffer.from(new Uint8Array(arrayBuffer));
        if (bytes.length !== object.size) fail();

        const sha256 = createHash("sha256").update(bytes).digest("hex");
        if (
          authorityObject.sha256 !== undefined &&
          authorityObject.sha256 !== sha256
        )
          fail();

        index++;
        const exportPath = `storage/objects/${padIndex(index)}.bin`;
        files.push({ source: "storage", path: exportPath, bytes });

        const manifestObject = {
          bucket: bucket.id,
          key: object.key,
          id: object.id,
          updated_at: object.updated_at,
          size: object.size,
        };
        if (object.version !== undefined)
          manifestObject.version = object.version;
        manifestObject.sha256 = sha256;
        manifestObject.exportPath = exportPath;
        manifestObjects.push(manifestObject);
      }
    }

    const secondNetwork = await listStorageInventory(storage);
    if (!deepEqual(firstNetwork, secondNetwork)) fail();

    const manifestBuckets = firstNetwork.buckets.map((bucket) => {
      const entry = { id: bucket.id };
      if (bucket.metadata !== undefined) entry.metadata = bucket.metadata;
      return entry;
    });

    const manifest = {
      version: 1,
      buckets: manifestBuckets,
      objects: manifestObjects,
    };

    const manifestBytes = Buffer.from(JSON.stringify(manifest), "utf8");
    totalBytes += manifestBytes.length;
    if (totalBytes > MAX_TOTAL_SIZE) fail();

    files.push({
      source: "storage",
      path: MANIFEST_PATH,
      bytes: manifestBytes,
    });

    return files;
  } catch {
    fail();
  }
}
