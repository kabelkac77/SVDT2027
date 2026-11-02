import {
  statSync,
  lstatSync,
  mkdirSync,
  openSync,
  writeSync,
  closeSync,
  fsyncSync,
  unlinkSync,
  linkSync,
  rmdirSync,
  fstatSync,
  constants as fsConstants,
} from 'node:fs';
import { dirname, join } from 'node:path';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export const REQUIRED_SOURCES = ['sources', 'crew', 'inputs', 'postgres', 'storage', 'exports'];

const SOURCES_REQUIRING_FILES = new Set(['sources', 'crew', 'inputs', 'postgres', 'exports']);

const MAGIC = Buffer.from('SVDTBACKUP1\n', 'ascii');
const KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 10000;
const MAX_PATH_LENGTH = 1000;
const MAX_GUNZIP_OUTPUT = 192 * 1024 * 1024;

const FAIL_MESSAGE = 'Záložní balíček není platný nebo jej nelze bezpečně zpracovat.';

const ISO_CREATED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail() {
  throw new Error(FAIL_MESSAGE);
}

function isBufferLike(value) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function toBuffer(value) {
  return Buffer.from(value);
}

function isValidPath(p, source) {
  if (typeof p !== 'string') return false;
  if (p.length === 0 || p.length > MAX_PATH_LENGTH || !p.isWellFormed()) return false;
  if (p.includes('\\')) return false;
  for (let i = 0; i < p.length; i++) {
    const code = p.charCodeAt(i);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return false;
  }
  if (p.startsWith('/')) return false;
  if (/^[A-Za-z]:/.test(p)) return false;
  const prefix = `${source}/`;
  if (!p.startsWith(prefix)) return false;
  const segments = p.split('/');
  for (const segment of segments) {
    if (segment.length === 0 || Buffer.byteLength(segment, 'utf8') > 255) return false;
    if (segment === '.' || segment === '..') return false;
  }
  return true;
}

function dedupeKey(p) {
  return p.normalize('NFC').toLowerCase();
}

function validateFileTree(paths) {
  for (const file of paths) {
    const pieces = file.split('/');
    for (let i = 1; i < pieces.length; i++) if (paths.has(pieces.slice(0, i).join('/'))) fail();
  }
}

function isValidCreatedAt(value) {
  return typeof value === 'string' && ISO_CREATED_AT_RE.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isStrictBase64(value) {
  return typeof value === 'string' && BASE64_RE.test(value);
}

function validateSourcesDeclaration(sources) {
  if (!Array.isArray(sources) || sources.length !== REQUIRED_SOURCES.length) fail();
  const seen = new Map();
  for (const entry of sources) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) fail();
    const name = entry.name;
    const complete = entry.complete;
    const fileCount = entry.fileCount;
    if (typeof name !== 'string' || !REQUIRED_SOURCES.includes(name)) fail();
    if (seen.has(name)) fail();
    if (complete !== true) fail();
    if (!Number.isInteger(fileCount) || fileCount < 0) fail();
    seen.set(name, fileCount);
  }
  for (const required of REQUIRED_SOURCES) {
    if (!seen.has(required)) fail();
  }
  return seen;
}

function validateFiles(files, sourceDeclaration) {
  if (!Array.isArray(files) || files.length > MAX_FILES) fail();
  const counts = new Map();
  for (const name of REQUIRED_SOURCES) counts.set(name, 0);
  const seenPaths = new Set();
  let totalBytes = 0;
  const result = [];
  for (const file of files) {
    if (typeof file !== 'object' || file === null || Array.isArray(file)) fail();
    const source = file.source;
    const filePath = file.path;
    const bytes = file.bytes;
    if (typeof source !== 'string' || !REQUIRED_SOURCES.includes(source)) fail();
    if (!isValidPath(filePath, source)) fail();
    if (!isBufferLike(bytes)) fail();
    if (totalBytes + bytes.byteLength > MAX_TOTAL_BYTES) fail();
    const buf = toBuffer(bytes);
    const key = dedupeKey(filePath);
    if (seenPaths.has(key)) fail();
    seenPaths.add(key);
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail();
    counts.set(source, counts.get(source) + 1);
    result.push({
      source,
      path: filePath,
      size: buf.length,
      sha256: createHash('sha256').update(buf).digest('hex'),
      base64: buf.toString('base64'),
      bytes: buf,
    });
  }
  validateFileTree(seenPaths);
  for (const [name, fileCount] of sourceDeclaration) {
    if (counts.get(name) !== fileCount) fail();
    if (SOURCES_REQUIRING_FILES.has(name) && fileCount < 1) fail();
  }
  return result;
}

function createBackupInner(files, sources, key) {
  if (!isBufferLike(key) || key.length !== KEY_LENGTH) fail();
  const keyBuf = toBuffer(key);
  const sourceDeclaration = validateSourcesDeclaration(sources);
  const validatedFiles = validateFiles(files, sourceDeclaration);

  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    sources: REQUIRED_SOURCES.map((name) => ({
      name,
      complete: true,
      fileCount: sourceDeclaration.get(name),
    })),
    files: validatedFiles.map((f) => ({
      source: f.source,
      path: f.path,
      size: f.size,
      sha256: f.sha256,
      base64: f.base64,
    })),
  };

  const gzipped = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  const nonce = randomBytes(NONCE_LENGTH);
  const aad = Buffer.concat([MAGIC, nonce]);
  const cipher = createCipheriv('aes-256-gcm', keyBuf, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(gzipped), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([MAGIC, nonce, ciphertext, tag]);
}

export function createBackup(files, sources, key) {
  try {
    return createBackupInner(files, sources, key);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }
}

function readBackupInner(bundle, key) {
  if (!isBufferLike(bundle)) fail();
  if (bundle.byteLength > MAX_GUNZIP_OUTPUT + 1024 * 1024) fail();
  const buf = toBuffer(bundle);
  if (!isBufferLike(key) || key.length !== KEY_LENGTH) fail();
  const keyBuf = toBuffer(key);

  const minLength = MAGIC.length + NONCE_LENGTH + TAG_LENGTH;
  if (buf.length < minLength) fail();
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) fail();

  const nonce = buf.subarray(MAGIC.length, MAGIC.length + NONCE_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(MAGIC.length + NONCE_LENGTH, buf.length - TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', keyBuf, nonce);
  decipher.setAAD(Buffer.concat([MAGIC, nonce]));
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  const gunzipped = gunzipSync(decrypted, { maxOutputLength: MAX_GUNZIP_OUTPUT });

  const payload = JSON.parse(gunzipped.toString('utf8'));
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) fail();
  if (payload.version !== 1) fail();
  if (!isValidCreatedAt(payload.createdAt)) fail();

  const sourceDeclaration = validateSourcesDeclaration(payload.sources);
  if (!Array.isArray(payload.files) || payload.files.length > MAX_FILES) fail();

  const counts = new Map();
  for (const name of REQUIRED_SOURCES) counts.set(name, 0);
  const seenPaths = new Set();
  let totalBytes = 0;
  const outputFiles = [];

  for (const entry of payload.files) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) fail();
    const source = entry.source;
    const filePath = entry.path;
    const size = entry.size;
    const sha256 = entry.sha256;
    const base64 = entry.base64;

    if (typeof source !== 'string' || !REQUIRED_SOURCES.includes(source)) fail();
    if (!isValidPath(filePath, source)) fail();
    if (!Number.isInteger(size) || size < 0) fail();
    if (typeof sha256 !== 'string' || !SHA256_HEX_RE.test(sha256)) fail();
    if (!isStrictBase64(base64)) fail();

    const bytes = Buffer.from(base64, 'base64');
    if (bytes.toString('base64') !== base64) fail();
    if (bytes.length !== size) fail();
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) fail();

    const dedup = dedupeKey(filePath);
    if (seenPaths.has(dedup)) fail();
    seenPaths.add(dedup);

    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail();

    counts.set(source, counts.get(source) + 1);
    outputFiles.push({ source, path: filePath, bytes });
  }

  validateFileTree(seenPaths);
  for (const [name, fileCount] of sourceDeclaration) {
    if (counts.get(name) !== fileCount) fail();
    if (SOURCES_REQUIRING_FILES.has(name) && fileCount < 1) fail();
  }

  return {
    version: 1,
    createdAt: payload.createdAt,
    sources: REQUIRED_SOURCES.map((name) => ({
      name,
      complete: true,
      fileCount: sourceDeclaration.get(name),
    })),
    files: outputFiles,
  };
}

export function readBackup(bundle, key) {
  try {
    return readBackupInner(bundle, key);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }
}

function writeAll(fd, buffer) {
  let written = 0;
  while (written < buffer.length) {
    const count = writeSync(fd, buffer, written, buffer.length - written);
    if (count <= 0) fail();
    written += count;
  }
}

function writeBackupExclusiveInner(target, bundle) {
  if (typeof target !== 'string' || target.length === 0) fail();
  if (!isBufferLike(bundle)) fail();
  const bundleBuf = toBuffer(bundle);

  const parentDir = dirname(target);
  let parentStat;
  try {
    parentStat = statSync(parentDir);
  } catch {
    fail();
  }
  if (!parentStat.isDirectory()) fail();

  let targetExists = true;
  try {
    lstatSync(target);
  } catch {
    targetExists = false;
  }
  if (targetExists) fail();

  const tempPath = join(parentDir, `.svdt-backup-tmp-${randomBytes(16).toString('hex')}`);
  let fd;
  try {
    fd = openSync(tempPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL, 0o600);
    writeAll(fd, bundleBuf);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    linkSync(tempPath, target);
  } catch {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // best effort cleanup only
      }
    }
    try {
      unlinkSync(tempPath);
    } catch {
      // best effort cleanup only
    }
    fail();
  }

  try {
    unlinkSync(tempPath);
  } catch {
    // publication already succeeded via link; stray temp name is harmless
  }
}

export function writeBackupExclusive(target, bundle) {
  try {
    writeBackupExclusiveInner(target, bundle);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }
}

function restoreBackupExclusiveInner(target, bundle, key) {
  if (typeof target !== 'string' || target.length === 0) fail();
  const result = readBackupInner(bundle, key);
  try { lstatSync(target); fail(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  mkdirSync(target, {mode: 0o700});
  const directories = [{path: target, info: lstatSync(target, {bigint:true})}];
  const files = [];
  const same = (a,b) => a.dev === b.dev && a.ino === b.ino;
  const ownedDirectory = (path) => {
    const current = lstatSync(path, {bigint:true});
    if (!current.isDirectory() || !directories.some(item => same(item.info,current))) fail();
  };
  try {
    for (const file of result.files) {
      ownedDirectory(target);
      const segments = file.path.split('/');
      let currentDir = target;
      for (let i=0;i<segments.length-1;i++) {
        currentDir = join(currentDir,segments[i]);
        try { mkdirSync(currentDir,{mode:0o700}); directories.push({path:currentDir,info:lstatSync(currentDir,{bigint:true})}); }
        catch (error) { if (error.code !== 'EEXIST') throw error; ownedDirectory(currentDir); }
      }
      const path = join(target,...segments);
      const fd = openSync(path,fsConstants.O_WRONLY|fsConstants.O_CREAT|fsConstants.O_EXCL,0o600);
      try { files.push({path,info:fstatSync(fd,{bigint:true})}); writeAll(fd,file.bytes); fsyncSync(fd); }
      finally { closeSync(fd); }
    }
  } catch {
    // Remove only objects we actually created; never recursively delete foreign contents.
    for (const item of files.reverse()) {
      try { if (same(lstatSync(item.path,{bigint:true}),item.info)) unlinkSync(item.path); } catch {}
    }
    for (const item of directories.reverse()) {
      try { if (same(lstatSync(item.path,{bigint:true}),item.info)) rmdirSync(item.path); } catch {}
    }
    fail();
  }
  return {files:result.files.length};
}

export function restoreBackupExclusive(target, bundle, key) {
  try {
    return restoreBackupExclusiveInner(target, bundle, key);
  } catch {
    throw new Error(FAIL_MESSAGE);
  }
}
