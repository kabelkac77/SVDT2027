import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readSync,
  realpathSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { isAbsolute, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const SERVICE_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const RELATION_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const MANDATORY_RELATIONS = [
  "auth.users",
  "auth.identities",
  "storage.buckets",
  "storage.objects",
  "public.events",
  "public.editions",
  "public.edition_members",
];

const SUBPROCESS_TIMEOUT_MS = 300000;
const SUBPROCESS_MAX_BUFFER = 4 * 1024 * 1024;
const MAX_DUMP_BYTES = 128 * 1024 * 1024;
const DUMP_SIGNATURE = Buffer.from("PGDMP", "ascii");
const TOC_TABLE_DATA_LINE =
  /^\d+;\s+\d+\s+\d+\s+TABLE DATA\s+(\S+)\s+(\S+)\s+\S+\s*$/;

function fail(reason) {
  throw new Error(reason);
}

function validateInputs(options) {
  if (!options || typeof options !== "object") fail("invalid-options");
  const {
    pgDumpExecutable,
    pgRestoreExecutable,
    service,
    serviceFile,
    passFile,
    parent,
    requiredRelations,
  } = options;

  for (const value of [
    pgDumpExecutable,
    pgRestoreExecutable,
    serviceFile,
    passFile,
    parent,
  ]) {
    if (typeof value !== "string" || value.length === 0 || !isAbsolute(value))
      fail("invalid-path");
  }
  if (typeof service !== "string" || !SERVICE_PATTERN.test(service))
    fail("invalid-service");
  if (!Array.isArray(requiredRelations) || requiredRelations.length === 0)
    fail("invalid-relations");
  if (new Set(requiredRelations).size !== requiredRelations.length)
    fail("duplicate-relations");
  for (const relation of requiredRelations) {
    if (typeof relation !== "string" || !RELATION_PATTERN.test(relation))
      fail("invalid-relation-format");
  }
  const relationSet = new Set(requiredRelations);
  for (const mandatory of MANDATORY_RELATIONS) {
    if (!relationSet.has(mandatory)) fail("missing-mandatory-relation");
  }

  return {
    pgDumpExecutable,
    pgRestoreExecutable,
    service,
    serviceFile,
    passFile,
    parent,
    requiredRelations,
  };
}

function ensurePrivateConfigFile(filePath) {
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) fail("invalid-config-file");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid())
    fail("invalid-config-owner");
  if ((stat.mode & 0o077) !== 0) fail("invalid-config-perms");
}

function resolveExecutable(execPath) {
  const real = realpathSync(execPath);
  const stat = statSync(real);
  if (!stat.isFile()) fail("invalid-executable");
  if ((stat.mode & 0o111) === 0) fail("not-executable");
  return real;
}

function ensureParentDirectory(dirPath) {
  const stat = lstatSync(dirPath);
  if (!stat.isDirectory()) fail("invalid-parent");
}

function createExclusiveDumpFile(dumpPath) {
  const fd = openSync(
    dumpPath,
    fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY,
    0o600,
  );
  try {
    const stat = fstatSync(fd, { bigint: true });
    return { dev: stat.dev, ino: stat.ino };
  } finally {
    closeSync(fd);
  }
}

function buildRestrictedEnv(serviceFile, passFile) {
  const env = {};
  if (process.env.PATH) env.PATH = process.env.PATH;
  if (process.env.LANG) env.LANG = process.env.LANG;
  if (process.env.LC_ALL) env.LC_ALL = process.env.LC_ALL;
  env.PGSERVICEFILE = serviceFile;
  env.PGPASSFILE = passFile;
  env.PGAPPNAME = "svdt-backup";
  env.PGCONNECT_TIMEOUT = "15";
  return env;
}

function runSubprocess(command, args, env, { captureStdout } = {}) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", captureStdout ? "pipe" : "ignore", "pipe"],
    timeout: SUBPROCESS_TIMEOUT_MS,
    maxBuffer: SUBPROCESS_MAX_BUFFER,
    env,
    shell: false,
  });
  if (result.error) fail("subprocess-launch-failed");
  if (result.signal) fail("subprocess-signal");
  const stderrText = result.stderr ? result.stderr.toString("utf8") : "";
  if (stderrText.trim().length > 0) fail("subprocess-stderr");
  if (result.status !== 0) fail("subprocess-exit-nonzero");
  return captureStdout
    ? result.stdout
      ? result.stdout.toString("utf8")
      : ""
    : "";
}

function runVersionCheck(executable, env, tool) {
  const output = runSubprocess(executable, ["--version"], env, {
    captureStdout: true,
  });
  const match = output
    .trim()
    .match(
      /^pg_(dump|restore) \(PostgreSQL\) (\d+)(?:\.(\d+))?(?:\.(\d+))?(?: \([^()\r\n]*\))?$/,
    );
  if (!match || `pg_${match[1]}` !== tool) fail("version-unparseable");
  const major =
    Number(match[2]) < 10 ? `${match[2]}.${match[3] || "0"}` : match[2];
  return {
    raw: match
      .slice(2, 5)
      .filter((v) => v !== undefined)
      .join("."),
    major,
  };
}

function runPgDump(pgDumpExecutable, env, service, dumpPath) {
  runSubprocess(
    pgDumpExecutable,
    [
      "--format=custom",
      "--no-password",
      `--file=${dumpPath}`,
      `--dbname=service=${service}`,
    ],
    env,
    { captureStdout: false },
  );
}

function runPgRestoreList(pgRestoreExecutable, env, dumpPath) {
  return runSubprocess(pgRestoreExecutable, ["--list", dumpPath], env, {
    captureStdout: true,
  });
}

function unquoteIdentifier(token) {
  if (token.length >= 2 && token.startsWith('"') && token.endsWith('"')) {
    return token.slice(1, -1).replace(/""/g, '"');
  }
  return token;
}

function parseTableDataRelations(tocText) {
  const relations = new Set();
  for (const line of tocText.split(/\r?\n/)) {
    const match = line.match(TOC_TABLE_DATA_LINE);
    if (!match) continue;
    const schema = unquoteIdentifier(match[1]);
    const table = unquoteIdentifier(match[2]);
    relations.add(`${schema}.${table}`);
  }
  return relations;
}

function attemptCleanup(dumpPath, dumpIdentity, tempDir, tempIdentity) {
  if (dumpPath && dumpIdentity) {
    try {
      const stat = lstatSync(dumpPath, { bigint: true });
      if (
        stat.isFile() &&
        stat.dev === dumpIdentity.dev &&
        stat.ino === dumpIdentity.ino
      ) {
        unlinkSync(dumpPath);
      }
    } catch {
      // best-effort only; never escalate cleanup failures
    }
  }
  if (tempDir) {
    try {
      const now = lstatSync(tempDir, { bigint: true });
      if (
        now.isDirectory() &&
        now.dev === tempIdentity?.dev &&
        now.ino === tempIdentity?.ino
      )
        rmdirSync(tempDir);
    } catch {
      // non-empty (foreign content) or already removed; never recursive-delete
    }
  }
}

export async function collectPostgres(options) {
  let tempDir;
  let dumpPath;
  let dumpIdentity;
  let tempIdentity;

  try {
    const input = validateInputs(options);

    ensurePrivateConfigFile(input.serviceFile);
    ensurePrivateConfigFile(input.passFile);

    const pgDumpReal = resolveExecutable(input.pgDumpExecutable);
    const pgRestoreReal = resolveExecutable(input.pgRestoreExecutable);
    ensureParentDirectory(input.parent);

    const env = buildRestrictedEnv(input.serviceFile, input.passFile);

    const dumpVersion = runVersionCheck(pgDumpReal, env, "pg_dump");
    const restoreVersion = runVersionCheck(pgRestoreReal, env, "pg_restore");
    if (dumpVersion.major !== restoreVersion.major)
      fail("version-major-mismatch");

    tempDir = mkdtempSync(join(input.parent, ".svdt-pg-collector-"));
    chmodSync(tempDir, 0o700);
    tempIdentity = lstatSync(tempDir, { bigint: true });

    dumpPath = join(tempDir, "database.dump");
    dumpIdentity = createExclusiveDumpFile(dumpPath);

    runPgDump(pgDumpReal, env, input.service, dumpPath);

    const dumpStat = lstatSync(dumpPath, { bigint: true });
    if (dumpStat.isSymbolicLink() || !dumpStat.isFile()) fail("dump-replaced");
    if (dumpStat.dev !== dumpIdentity.dev || dumpStat.ino !== dumpIdentity.ino)
      fail("dump-replaced");
    if (dumpStat.size <= 0n || dumpStat.size > BigInt(MAX_DUMP_BYTES))
      fail("dump-size-invalid");

    if ((dumpStat.mode & 0o077n) !== 0n) fail("dump-not-private");
    const fd = openSync(
      dumpPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    let dumpBuffer;
    try {
      const opened = fstatSync(fd, { bigint: true });
      if (
        opened.dev !== dumpStat.dev ||
        opened.ino !== dumpStat.ino ||
        opened.size !== dumpStat.size ||
        opened.mtimeNs !== dumpStat.mtimeNs
      )
        fail("dump-changed");
      dumpBuffer = Buffer.alloc(Number(opened.size));
      let offset = 0;
      while (offset < dumpBuffer.length) {
        const count = readSync(
          fd,
          dumpBuffer,
          offset,
          dumpBuffer.length - offset,
          offset,
        );
        if (!count) fail("dump-short");
        offset += count;
      }
      if (readSync(fd, Buffer.alloc(1), 0, 1, offset)) fail("dump-grown");
    } finally {
      closeSync(fd);
    }

    if (!dumpBuffer.subarray(0, DUMP_SIGNATURE.length).equals(DUMP_SIGNATURE))
      fail("dump-signature-invalid");

    const sha256 = createHash("sha256").update(dumpBuffer).digest("hex");

    const tocText = runPgRestoreList(pgRestoreReal, env, dumpPath);
    const listed = lstatSync(dumpPath, { bigint: true });
    if (
      !listed.isFile() ||
      listed.dev !== dumpStat.dev ||
      listed.ino !== dumpStat.ino ||
      listed.size !== dumpStat.size ||
      listed.mtimeNs !== dumpStat.mtimeNs
    )
      fail("dump-changed-after-list");
    const foundRelations = parseTableDataRelations(tocText);
    for (const relation of input.requiredRelations) {
      if (!foundRelations.has(relation)) fail("required-relation-missing");
    }

    const manifest = {
      version: 1,
      format: "pg_dump_custom",
      dumpVersion: dumpVersion.raw,
      restoreVersion: restoreVersion.raw,
      requiredRelations: [...input.requiredRelations],
      sha256,
      fullDatabase: true,
      serverRolesIncluded: false,
      storageObjectsIncluded: false,
      restoreTested: false,
    };
    const manifestBuffer = Buffer.from(
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    attemptCleanup(dumpPath, dumpIdentity, tempDir, tempIdentity);

    return [
      { source: "postgres", path: "postgres/database.dump", bytes: dumpBuffer },
      {
        source: "postgres",
        path: "postgres/manifest.json",
        bytes: manifestBuffer,
      },
    ];
  } catch {
    attemptCleanup(dumpPath, dumpIdentity, tempDir, tempIdentity);
    throw new Error("BACKUP_POSTGRES_FAILED");
  }
}
