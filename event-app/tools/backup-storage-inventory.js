const MAX_OBJECTS = 9999;
const MAX_TOTAL_SIZE = 128 * 1024 * 1024;
const MAX_BUCKETS = 10000;
const MAX_LIST_PAGES = 1000;
const MAX_PAGE_SIZE = 1000;
const MAX_KEY_LENGTH = 1000;
const MAX_UTF8_SEGMENT_BYTES = 255;
const SHA256_RE = /^[0-9a-f]{64}$/;

const utf8Encoder = new TextEncoder();

function fail() {
  throw new Error("BACKUP_STORAGE_FAILED");
}

function utf8ByteLength(value) {
  return utf8Encoder.encode(value).length;
}

function hasC0OrDel(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function hasLoneSurrogate(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isSafeIdentityText(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !hasC0OrDel(value) &&
    !hasLoneSurrogate(value)
  );
}

function isSafeBucketId(id) {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > MAX_KEY_LENGTH) return false;
  if (hasC0OrDel(id) || hasLoneSurrogate(id)) return false;
  if (id.includes("/") || id.includes("\\")) return false;
  if (id === "." || id === "..") return false;
  if (utf8ByteLength(id) > MAX_UTF8_SEGMENT_BYTES) return false;
  return true;
}

function isSafeRelativeKey(key) {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > MAX_KEY_LENGTH) return false;
  if (hasC0OrDel(key) || hasLoneSurrogate(key)) return false;
  if (key.includes("\\")) return false;
  if (key.startsWith("/")) return false;
  const segments = key.split("/");
  for (const segment of segments) {
    if (segment.length === 0) return false;
    if (segment === "." || segment === "..") return false;
    if (utf8ByteLength(segment) > MAX_UTF8_SEGMENT_BYTES) return false;
  }
  return true;
}

function isSafeSize(size) {
  return Number.isSafeInteger(size) && size >= 0;
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function rejectUnsupportedVersioning(entry) {
  if (entry.is_versioned === true) fail();
  if (
    entry.versioning_status !== undefined &&
    entry.versioning_status !== "DISABLED"
  )
    fail();
  if (entry.archived_at !== undefined && entry.archived_at !== null) fail();
  if (entry.is_delete_marker === true) fail();
}

function validateBucketMetadata(metadata) {
  if (metadata === undefined) return undefined;
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  )
    fail();

  const result = {};

  if ("public" in metadata) {
    if (typeof metadata.public !== "boolean") fail();
    result.public = metadata.public;
  }

  if ("allowed_mime_types" in metadata) {
    const value = metadata.allowed_mime_types;
    if (value === null) {
      result.allowed_mime_types = null;
    } else {
      if (
        !Array.isArray(value) ||
        value.length > 1000 ||
        !value.every((item) => isSafeIdentityText(item) && item.length <= 255)
      )
        fail();
      result.allowed_mime_types = value.slice();
    }
  }

  if ("file_size_limit" in metadata) {
    const value = metadata.file_size_limit;
    if (
      value !== null &&
      !(
        isSafeSize(value) ||
        (typeof value === "string" &&
          /^[0-9]{1,16}$/.test(value) &&
          isSafeSize(Number(value)))
      )
    )
      fail();
    result.file_size_limit = value;
  }

  return result;
}

function validateAuthorityObjectEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  if (!isSafeRelativeKey(raw.key)) fail();
  if (!isSafeIdentityText(raw.id)) fail();
  if (!isSafeIdentityText(raw.updated_at)) fail();
  if (!isSafeSize(raw.size)) fail();

  const entry = {
    key: raw.key,
    id: raw.id,
    updated_at: raw.updated_at,
    size: raw.size,
  };

  if (raw.version !== undefined) {
    if (!isSafeIdentityText(raw.version)) fail();
    entry.version = raw.version;
  }

  if (raw.sha256 !== undefined) {
    if (typeof raw.sha256 !== "string" || !SHA256_RE.test(raw.sha256)) fail();
    entry.sha256 = raw.sha256;
  }

  return entry;
}

function validateAuthorityBucketEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  if (!isSafeBucketId(raw.id)) fail();
  if (!Array.isArray(raw.objects) || raw.objects.length > MAX_OBJECTS) fail();
  rejectUnsupportedVersioning(raw);

  const objects = raw.objects.map(validateAuthorityObjectEntry);
  const keys = new Set();
  for (const object of objects) {
    if (keys.has(object.key)) fail();
    keys.add(object.key);
  }

  const bucket = { id: raw.id, objects };
  const metadata = validateBucketMetadata(raw.metadata);
  if (metadata !== undefined) bucket.metadata = metadata;

  return bucket;
}

/**
 * Validates and normalizes an authoritative backup inventory manifest.
 */
function validateInventoryInternal(inventory) {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory))
    fail();
  if (inventory.complete !== true) fail();
  if (!Array.isArray(inventory.buckets)) fail();
  if (inventory.buckets.length > MAX_BUCKETS) fail();

  const bucketIds = new Set();
  const buckets = [];
  let totalObjects = 0;
  let totalSize = 0;

  for (const rawBucket of inventory.buckets) {
    const bucket = validateAuthorityBucketEntry(rawBucket);
    if (bucketIds.has(bucket.id)) fail();
    bucketIds.add(bucket.id);

    totalObjects += bucket.objects.length;
    if (totalObjects > MAX_OBJECTS) fail();

    for (const object of bucket.objects) {
      totalSize += object.size;
    }
    if (totalSize > MAX_TOTAL_SIZE) fail();

    buckets.push(bucket);
  }

  buckets.sort((a, b) => compareStrings(a.id, b.id));
  for (const bucket of buckets) {
    bucket.objects.sort((a, b) => compareStrings(a.key, b.key));
  }

  return { complete: true, buckets };
}

function validateNetworkBucketEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  rejectUnsupportedVersioning(raw);
  if (raw.type !== undefined && raw.type !== "STANDARD") fail();
  if (!isSafeBucketId(raw.id)) fail();

  const bucket = { id: raw.id };
  const metadata = validateBucketMetadata(raw);
  if (metadata !== undefined) bucket.metadata = metadata;

  return bucket;
}

function validateNetworkObjectEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail();
  rejectUnsupportedVersioning(raw);

  const keySource = raw.key !== undefined ? raw.key : raw.name;
  if (!isSafeRelativeKey(keySource)) fail();
  if (!isSafeIdentityText(raw.id)) fail();
  if (!isSafeIdentityText(raw.updated_at)) fail();
  if (
    !raw.metadata ||
    typeof raw.metadata !== "object" ||
    Array.isArray(raw.metadata)
  )
    fail();
  if (!isSafeSize(raw.metadata.size)) fail();

  const entry = {
    key: keySource,
    id: raw.id,
    updated_at: raw.updated_at,
    size: raw.metadata.size,
  };

  if (raw.version !== undefined) {
    if (!isSafeIdentityText(raw.version)) fail();
    entry.version = raw.version;
  }

  return entry;
}

async function listBuckets(storage) {
  const buckets = [];
  const bucketIds = new Set();
  let offset = 0;
  let pageCount = 0;

  while (true) {
    pageCount++;
    if (pageCount > MAX_LIST_PAGES) fail();

    let response;
    try {
      response = await storage.listBuckets({
        limit: MAX_PAGE_SIZE,
        offset,
        sortColumn: "id",
        sortOrder: "asc",
      });
    } catch {
      fail();
    }

    if (!response || response.error) fail();
    const page = response.data;
    if (!Array.isArray(page) || page.length > MAX_PAGE_SIZE) fail();

    for (const rawBucket of page) {
      const bucket = validateNetworkBucketEntry(rawBucket);
      if (bucketIds.has(bucket.id)) fail();
      bucketIds.add(bucket.id);
      buckets.push(bucket);
      if (buckets.length > MAX_BUCKETS) fail();
    }

    if (page.length < MAX_PAGE_SIZE) break;
    offset += MAX_PAGE_SIZE;
  }

  return buckets;
}

async function listBucketObjects(storage, bucketId, budget) {
  let bucketHandle;
  try {
    bucketHandle = storage.from(bucketId);
  } catch {
    fail();
  }
  if (!bucketHandle || typeof bucketHandle.listV2 !== "function") fail();

  const objects = [];
  const objectKeys = new Set();
  const seenCursors = new Set();
  let cursor;
  let pageCount = 0;

  while (true) {
    pageCount++;
    if (pageCount > MAX_LIST_PAGES) fail();

    const params = { prefix: "", limit: MAX_PAGE_SIZE, with_delimiter: false };
    if (cursor !== undefined) params.cursor = cursor;

    let response;
    try {
      response = await bucketHandle.listV2(params);
    } catch {
      fail();
    }

    if (!response || response.error) fail();
    const data = response.data;
    if (!data || typeof data !== "object") fail();
    if (typeof data.hasNext !== "boolean") fail();
    if (!Array.isArray(data.folders) || data.folders.length !== 0) fail();
    if (!Array.isArray(data.objects) || data.objects.length > MAX_PAGE_SIZE)
      fail();

    if (data.hasNext) {
      if (data.objects.length === 0) fail();
      if (typeof data.nextCursor !== "string" || data.nextCursor.length === 0)
        fail();
      if (seenCursors.has(data.nextCursor)) fail();
      seenCursors.add(data.nextCursor);
    }

    for (const rawObject of data.objects) {
      const entry = validateNetworkObjectEntry(rawObject);
      if (objectKeys.has(entry.key)) fail();
      objectKeys.add(entry.key);
      if (
        ++budget.objects > MAX_OBJECTS ||
        budget.bytes + entry.size > MAX_TOTAL_SIZE
      )
        fail();
      budget.bytes += entry.size;
      objects.push(entry);
    }

    if (!data.hasNext) break;
    cursor = data.nextCursor;
  }

  return objects;
}

/**
 * Lists the current, possibly RLS-restricted, storage inventory over the network.
 * The result never asserts completeness; callers must compare it against a
 * separate authoritative inventory before relying on it as complete.
 */
async function listStorageInventoryInternal(storage) {
  if (
    !storage ||
    typeof storage.listBuckets !== "function" ||
    typeof storage.from !== "function"
  )
    fail();

  const buckets = await listBuckets(storage);
  const budget = { objects: 0, bytes: 0 };

  let totalObjects = 0;
  let totalSize = 0;

  for (const bucket of buckets) {
    const objects = await listBucketObjects(storage, bucket.id, budget);

    totalObjects += objects.length;
    if (totalObjects > MAX_OBJECTS) fail();

    for (const object of objects) {
      totalSize += object.size;
    }
    if (totalSize > MAX_TOTAL_SIZE) fail();

    objects.sort((a, b) => compareStrings(a.key, b.key));
    bucket.objects = objects;
  }

  buckets.sort((a, b) => compareStrings(a.id, b.id));

  return { buckets };
}

export function validateInventory(inventory) {
  try {
    return validateInventoryInternal(inventory);
  } catch {
    fail();
  }
}

export async function listStorageInventory(storage) {
  try {
    return await listStorageInventoryInternal(storage);
  } catch {
    fail();
  }
}
