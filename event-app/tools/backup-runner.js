import {
  lstatSync,
  openSync,
  writeSync,
  closeSync,
  fsyncSync,
  unlinkSync,
  fstatSync,
  constants as fsConstants,
} from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { createBackup, readBackup, REQUIRED_SOURCES } from "./backup-bundle.js";

function isBufferLike(value) {
  return Buffer.isBuffer(value) || value instanceof Uint8Array;
}

function notReady() {
  throw new Error("BACKUP_JOB_NOT_READY");
}

function failed() {
  throw new Error("BACKUP_JOB_FAILED");
}

function validateKey(key) {
  if (!isBufferLike(key) || key.length !== 32) notReady();
}

function validateDestination(destination) {
  if (
    typeof destination !== "object" ||
    destination === null ||
    destination.kind !== "remote" ||
    typeof destination.putExclusive !== "function" ||
    typeof destination.read !== "function"
  ) {
    notReady();
  }
}

function validateConsistency(consistency) {
  if (
    typeof consistency !== "object" ||
    consistency === null ||
    typeof consistency.acquire !== "function"
  ) {
    notReady();
  }
}

function validateLockPath(lockPath) {
  if (
    typeof lockPath !== "string" ||
    lockPath.length === 0 ||
    !isAbsolute(lockPath)
  )
    notReady();
  let parentStat;
  try {
    parentStat = lstatSync(dirname(lockPath));
  } catch {
    notReady();
  }
  if (!parentStat.isDirectory()) notReady();
}

function validateCollectors(collectors) {
  if (!Array.isArray(collectors) || collectors.length === 0) notReady();
  const owners = new Map();
  for (const collector of collectors) {
    if (typeof collector !== "object" || collector === null) notReady();
    const { sources, collect } = collector;
    if (
      !Array.isArray(sources) ||
      sources.length === 0 ||
      typeof collect !== "function"
    )
      notReady();
    for (const source of sources) {
      if (
        typeof source !== "string" ||
        !REQUIRED_SOURCES.includes(source) ||
        owners.has(source)
      )
        notReady();
      owners.set(source, collector);
    }
  }
  for (const required of REQUIRED_SOURCES) {
    if (!owners.has(required)) notReady();
  }
}

function validateStatic(options) {
  if (typeof options !== "object" || options === null) notReady();
  validateCollectors(options.collectors);
  validateKey(options.key);
  validateDestination(options.destination);
  validateLockPath(options.lockPath);
  validateConsistency(options.consistency);
}

function writeAll(fd, buffer) {
  let written = 0;
  while (written < buffer.length) {
    const count = writeSync(fd, buffer, written, buffer.length - written);
    if (count <= 0) throw new Error("write-failed");
    written += count;
  }
}

function acquireLock(lockPath) {
  let fd;
  let identity;
  try {
    fd = openSync(
      lockPath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL,
      0o600,
    );
  } catch (error) {
    // O_EXCL fails with EEXIST for any pre-existing path, including a foreign process's lock or a symlink.
    if (error && error.code === "EEXIST") throw new Error("BACKUP_JOB_LOCKED");
    throw new Error("BACKUP_JOB_NOT_READY");
  }
  try {
    const stat = fstatSync(fd, { bigint: true });
    identity = { dev: stat.dev, ino: stat.ino };
    const payload = Buffer.from(
      `${randomBytes(16).toString("hex")} ${process.pid}\n`,
      "ascii",
    );
    writeAll(fd, payload);
    fsyncSync(fd);
    return { fd, dev: stat.dev, ino: stat.ino, path: lockPath };
  } catch {
    try {
      closeSync(fd);
    } catch {
      // best effort
    }
    try {
      const now = lstatSync(lockPath, { bigint: true });
      if (
        now.isFile() &&
        now.dev === identity?.dev &&
        now.ino === identity?.ino
      )
        unlinkSync(lockPath);
    } catch {
      // best effort
    }
    throw new Error("BACKUP_JOB_NOT_READY");
  }
}

function releaseLock(lock) {
  let closed = true;
  try {
    closeSync(lock.fd);
  } catch {
    closed = false;
  }
  try {
    const current = lstatSync(lock.path, { bigint: true });
    if (
      !current.isFile() ||
      current.dev !== lock.dev ||
      current.ino !== lock.ino
    )
      return false;
    unlinkSync(lock.path);
    return closed;
  } catch {
    return false;
  }
}

async function collectAll(collectors) {
  const files = [];
  let totalBytes = 0;
  for (const collector of collectors) {
    const result = await collector.collect();
    if (!result || result.complete !== true || !Array.isArray(result.files)) {
      throw new Error("invalid-collector-result");
    }
    for (const file of result.files) {
      if (
        !file ||
        typeof file !== "object" ||
        !collector.sources.includes(file.source)
      ) {
        throw new Error("invalid-collector-file");
      }
      if (
        !isBufferLike(file.bytes) ||
        files.length >= 10000 ||
        totalBytes + file.bytes.byteLength > 128 * 1024 * 1024
      )
        throw new Error("invalid-collector-file");
      totalBytes += file.bytes.byteLength;
      files.push({
        source: file.source,
        path: file.path,
        bytes: Buffer.from(file.bytes),
      });
    }
  }
  return files;
}

async function finalizeBackup(files, key, destination) {
  const fileCounts = new Map(REQUIRED_SOURCES.map((name) => [name, 0]));
  for (const file of files) {
    fileCounts.set(file.source, (fileCounts.get(file.source) || 0) + 1);
  }
  const sourcesDeclaration = REQUIRED_SOURCES.map((name) => ({
    name,
    complete: true,
    fileCount: fileCounts.get(name),
  }));

  let bundle;
  let manifest;
  try {
    bundle = createBackup(files, sourcesDeclaration, key);
    manifest = readBackup(bundle, key);
  } catch {
    failed();
  }

  const id = `${randomUUID()}.svdtbackup`;
  const sha256 = createHash("sha256").update(bundle).digest("hex");

  try {
    await destination.putExclusive(id, Buffer.from(bundle));
  } catch {
    failed();
  }

  let remoteBytes;
  try {
    remoteBytes = await destination.read(id);
  } catch {
    failed();
  }

  if (!isBufferLike(remoteBytes)) failed();
  const remoteBuf = Buffer.from(remoteBytes);
  if (remoteBuf.length !== bundle.length) failed();
  if (createHash("sha256").update(remoteBuf).digest("hex") !== sha256) failed();

  try {
    readBackup(remoteBuf, key);
  } catch {
    failed();
  }

  const sourceCounts = {};
  for (const entry of manifest.sources) {
    sourceCounts[entry.name] = entry.fileCount;
  }

  return {
    version: 1,
    id,
    sha256,
    fileCount: manifest.files.length,
    byteCount: manifest.files.reduce(
      (total, file) => total + file.bytes.length,
      0,
    ),
    sourceCounts,
    remoteReadbackVerified: true,
  };
}

async function runBackupInternal(options) {
  validateStatic(options);
  const { key, lockPath } = options;
  const collectors = options.collectors.map((c) => ({
    sources: [...c.sources],
    collect: c.collect.bind(c),
  }));
  const destination = {
    kind: "remote",
    putExclusive: options.destination.putExclusive.bind(options.destination),
    read: options.destination.read.bind(options.destination),
  };
  const consistency = {
    acquire: options.consistency.acquire.bind(options.consistency),
  };

  const keyCopy = Buffer.from(key);
  let lock;
  try {
    lock = acquireLock(lockPath);
    let release;
    try {
      const acquired = await consistency.acquire();
      if (typeof acquired !== "function") throw new Error("invalid-release");
      release = acquired;
    } catch {
      notReady();
    }

    let files;
    let collectError = null;
    try {
      files = await collectAll(collectors);
    } catch (error) {
      collectError = error;
    } finally {
      try {
        await release();
      } catch (error) {
        collectError = collectError || error;
      }
    }

    if (collectError) failed();

    return await finalizeBackup(files, keyCopy, destination);
  } finally {
    keyCopy.fill(0);
    if (lock && !releaseLock(lock)) failed();
  }
}

export async function runBackup(options) {
  try {
    return await runBackupInternal(options);
  } catch (error) {
    const code = error?.message;
    throw new Error(
      [
        "BACKUP_JOB_NOT_READY",
        "BACKUP_JOB_LOCKED",
        "BACKUP_JOB_FAILED",
      ].includes(code)
        ? code
        : "BACKUP_JOB_FAILED",
    );
  }
}
