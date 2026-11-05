import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  open,
  realpath,
  rmdir,
  unlink,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";

const SOURCES = new Set(["sources", "inputs"]);
const MAX_PATH_LENGTH = 1000;
const MAX_SEGMENT_BYTES = 255;
const MAX_FILES = 10000;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;

const BLOCKED_SEGMENTS = new Set([
  ".git",
  ".local",
  ".next",
  "node_modules",
  "backups",
]);
const BLOCKED_EXTENSIONS = new Set([".key", ".pem", ".p12", ".pfx"]);

const CONTROL_CHAR_RE = /[\x00-\x1f\x7f-\x9f]/;
const LONE_SURROGATE_RE =
  /(?:[\ud800-\udbff](?![\udc00-\udfff]))|(?:(?<![\ud800-\udbff])[\udc00-\udfff])/;
const DRIVE_LETTER_RE = /^[A-Za-z]:/;
const STRICT_BASE64_RE =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail() {
  throw new Error("BACKUP_LOCAL_FAILED");
}

function mtimeNsOf(stat) {
  return stat.mtimeNs;
}

function validateRelativePath(rawPath) {
  if (typeof rawPath !== "string" || rawPath.length === 0) fail();
  if (rawPath.length > MAX_PATH_LENGTH) fail();
  if (rawPath.includes("\\")) fail();
  if (CONTROL_CHAR_RE.test(rawPath)) fail();
  if (LONE_SURROGATE_RE.test(rawPath)) fail();
  if (rawPath.startsWith("/")) fail();
  if (DRIVE_LETTER_RE.test(rawPath)) fail();

  const segments = rawPath.split("/");
  if (segments.length === 0) fail();

  for (const segment of segments) {
    if (segment.length === 0) fail();
    if (segment === "." || segment === "..") fail();
    if (Buffer.byteLength(segment, "utf8") > MAX_SEGMENT_BYTES) fail();
    const lowerSegment = segment.toLowerCase();
    if (BLOCKED_SEGMENTS.has(lowerSegment)) fail();
    if (lowerSegment.startsWith(".env")) fail();
  }

  const lastSegment = segments[segments.length - 1].toLowerCase();
  const extMatch = /\.[^.]+$/.exec(lastSegment);
  if (extMatch && BLOCKED_EXTENSIONS.has(extMatch[0])) fail();

  return segments;
}

async function readVerifiedFile(root, segments, remaining) {
  let currentDir = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const nextPath = path.join(currentDir, segments[i]);
    const dirStat = await lstat(nextPath).catch(() => fail());
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) fail();
    currentDir = nextPath;
  }

  const finalPath = path.join(currentDir, segments[segments.length - 1]);
  const preStat = await lstat(finalPath, { bigint: true }).catch(() => fail());
  if (
    preStat.isSymbolicLink() ||
    !preStat.isFile() ||
    preStat.size > BigInt(remaining)
  )
    fail();

  let handle;
  try {
    handle = await open(
      finalPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
  } catch {
    fail();
  }

  try {
    const openStat = await handle.stat({ bigint: true });
    if (
      !openStat.isFile() ||
      openStat.dev !== preStat.dev ||
      openStat.ino !== preStat.ino ||
      openStat.size !== preStat.size ||
      openStat.mtimeNs !== preStat.mtimeNs
    )
      fail();

    const buffer = Buffer.alloc(Number(openStat.size));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (!bytesRead) fail();
      offset += bytesRead;
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, offset)).bytesRead) fail();

    const postStat = await handle.stat({ bigint: true });
    if (
      !postStat.isFile() ||
      postStat.dev !== preStat.dev ||
      postStat.ino !== preStat.ino ||
      postStat.size !== openStat.size ||
      mtimeNsOf(postStat) !== mtimeNsOf(openStat)
    ) {
      fail();
    }
    if (BigInt(buffer.length) !== postStat.size) fail();

    return Buffer.from(buffer);
  } finally {
    await handle.close().catch(() => {});
  }
}

async function collectLocalFilesInternal(root, paths, source) {
  if (!SOURCES.has(source)) fail();
  if (typeof root !== "string" || root.length === 0 || !path.isAbsolute(root))
    fail();
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_FILES)
    fail();

  const rootStat = await lstat(root).catch(() => fail());
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail();

  const seen = new Set();
  const results = [];
  let totalBytes = 0;

  for (const rawPath of paths) {
    const segments = validateRelativePath(rawPath);

    const dedupeKey = rawPath.normalize("NFC").toLowerCase();
    if (seen.has(dedupeKey)) fail();
    seen.add(dedupeKey);

    const bytes = await readVerifiedFile(
      root,
      segments,
      MAX_TOTAL_BYTES - totalBytes,
    );
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail();

    results.push({ source, path: `${source}/${rawPath}`, bytes });
  }

  return results;
}

export async function collectLocalFiles(root, paths, source) {
  try {
    return await collectLocalFilesInternal(root, paths, source);
  } catch {
    throw new Error("BACKUP_LOCAL_FAILED");
  }
}

const PYTHON_SCRIPT = `
import sys
import json
import sqlite3
import base64
import csv
import io
import urllib.parse


REQUIRED_TABLES = {
    "meta": ["key", "value"],
    "history": ["id", "year", "content"],
    "categories": ["id", "name", "name_key", "color", "sort_order", "version"],
    "working": ["id", "year", "category_id", "content", "source_id", "version", "updated_at"],
    "audit": ["id", "at", "kind", "record_id", "before_json", "after_json"],
    "requests": ["id", "fingerprint", "response"],
}

FORMULA_TRIGGERS = ("=", "+", "-", "@", "\\t", "\\r")


def fail():
    sys.exit(1)


def quote_ident(name):
    return '"' + name.replace('"', '""') + '"'


def cell_text(value):
    if value is None:
        return ""
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    return str(value)


def protect_formula(text):
    stripped = text.lstrip(" \\t\\r\\n")
    if text.startswith(("\\t", "\\r")) or stripped[:1] in FORMULA_TRIGGERS:
        return "'" + text
    return text


def write_csv(columns, rows):
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\\r\\n")
    writer.writerow([protect_formula(str(column)) for column in columns])
    for row in rows:
        writer.writerow([protect_formula(cell_text(value)) for value in row])
    return ("\\ufeff" + buf.getvalue()).encode("utf-8")


def json_value(value):
    if isinstance(value, bytes):
        return {"type": "blob", "base64": base64.b64encode(value).decode("ascii")}
    return value


def main():
    payload = json.loads(sys.stdin.read())
    database = payload.get("database")
    output = payload.get("output")

    if not isinstance(database, str) or not isinstance(output, str):
        fail()

    source_uri = "file:" + urllib.parse.quote(database) + "?mode=ro"

    try:
        src = sqlite3.connect(source_uri, uri=True)
    except sqlite3.Error:
        fail()

    tables_payload = []
    table_rows_by_name = {}
    working_csv_columns = [
        "id",
        "year",
        "category",
        "name",
        "position",
        "owner",
        "status",
        "term",
        "friday",
        "saturday",
        "email",
        "phone",
        "notes",
        "estimate_halere",
        "agreed_halere",
        "total_halere",
        "paid_halere",
        "barter",
        "merch",
    ]
    working_csv_rows = []

    try:
        try:
            dest = sqlite3.connect(output)
        except sqlite3.Error:
            fail()

        try:
            try:
                page_size = src.execute("PRAGMA page_size").fetchone()[0]
                def check_progress(status, remaining, total):
                    if total * page_size > 128 * 1024 * 1024:
                        raise ValueError("snapshot limit")
                src.backup(dest, pages=128, progress=check_progress)
            except sqlite3.Error:
                fail()

            dest.execute("PRAGMA journal_mode=DELETE")

            cur = dest.execute("PRAGMA integrity_check")
            check_rows = cur.fetchall()
            if len(check_rows) != 1 or check_rows[0][0] != "ok":
                fail()

            cur = dest.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name"
            )
            table_names = [row[0] for row in cur.fetchall()]

            if not set(REQUIRED_TABLES.keys()).issubset(set(table_names)):
                fail()

            columns_by_table = {}
            for name in table_names:
                cur = dest.execute("PRAGMA table_xinfo(%s)" % quote_ident(name))
                info_rows = sorted(cur.fetchall(), key=lambda r: r[0])
                columns_by_table[name] = [row[1] for row in info_rows if len(row) < 7 or row[6] != 1]

            for required_name, required_columns in REQUIRED_TABLES.items():
                if not set(required_columns).issubset(set(columns_by_table[required_name])):
                    fail()

            cur = dest.execute('SELECT "value" FROM "meta" WHERE "key" = ?', ("initialized",))
            meta_row = cur.fetchone()
            if meta_row is None or not isinstance(meta_row[0], str) or meta_row[0].strip() == "":
                fail()

            for name in table_names:
                columns = columns_by_table[name]
                select_columns = ", ".join(quote_ident(c) for c in columns)
                cur = dest.execute("SELECT %s FROM %s" % (select_columns, quote_ident(name)))
                raw_rows = cur.fetchall()
                table_rows_by_name[name] = raw_rows
                tables_payload.append(
                    {
                        "name": name,
                        "columns": columns,
                        "rows": [[json_value(value) for value in row] for row in raw_rows],
                    }
                )

            categories_columns = columns_by_table["categories"]
            categories_id_idx = categories_columns.index("id")
            categories_name_idx = categories_columns.index("name")
            category_name_by_id = {}
            for row in table_rows_by_name["categories"]:
                category_name_by_id[row[categories_id_idx]] = row[categories_name_idx]

            working_columns = columns_by_table["working"]
            working_idx = {c: i for i, c in enumerate(working_columns)}

            for row in table_rows_by_name["working"]:
                content_raw = row[working_idx["content"]]
                if not isinstance(content_raw, str):
                    fail()
                try:
                    content = json.loads(content_raw)
                except ValueError:
                    fail()
                if not isinstance(content, dict):
                    fail()

                money = content.get("money")
                if money is not None and not isinstance(money, dict):
                    fail()
                money = money or {}

                category_id = row[working_idx["category_id"]]
                category_name = category_name_by_id.get(category_id, "")

                working_csv_rows.append(
                    [
                        row[working_idx["id"]],
                        row[working_idx["year"]],
                        category_name,
                        content.get("name"),
                        content.get("position"),
                        content.get("owner"),
                        content.get("status"),
                        content.get("term"),
                        content.get("friday"),
                        content.get("saturday"),
                        content.get("email"),
                        content.get("phone"),
                        content.get("notes"),
                        money.get("estimate"),
                        money.get("agreed"),
                        money.get("total"),
                        money.get("paid"),
                        content.get("barter"),
                        content.get("merch"),
                    ]
                )
        finally:
            dest.close()
    finally:
        src.close()

    import os
    if os.path.getsize(output) > 128 * 1024 * 1024:
        fail()
    with open(output, "rb") as fh:
        snapshot_bytes = fh.read()

    tables_json_bytes = json.dumps(tables_payload).encode("utf-8")

    export_meta = {
        "version": 1,
        "tables": [
            {"name": t["name"], "count": len(t["rows"]), "columns": t["columns"]}
            for t in tables_payload
        ],
    }
    export_json_bytes = json.dumps(export_meta).encode("utf-8")

    working_csv_bytes = write_csv(working_csv_columns, working_csv_rows)

    files = [
        {
            "source": "crew",
            "path": "workspace.sqlite3",
            "base64": base64.b64encode(snapshot_bytes).decode("ascii"),
        },
        {
            "source": "exports",
            "path": "crew-tables.json",
            "base64": base64.b64encode(tables_json_bytes).decode("ascii"),
        },
    ]

    for index, table in enumerate(tables_payload, start=1):
        csv_bytes = write_csv(table["columns"], table_rows_by_name[table["name"]])
        files.append(
            {
                "source": "exports",
                "path": "crew-table-%04d.csv" % index,
                "base64": base64.b64encode(csv_bytes).decode("ascii"),
            }
        )

    files.append(
        {
            "source": "exports",
            "path": "crew-export.json",
            "base64": base64.b64encode(export_json_bytes).decode("ascii"),
        }
    )
    files.append(
        {
            "source": "exports",
            "path": "crew-working.csv",
            "base64": base64.b64encode(working_csv_bytes).decode("ascii"),
        }
    )

    sys.stdout.write(json.dumps({"files": files}))


try:
    main()
except SystemExit:
    raise
except Exception:
    sys.exit(1)
`;

const EXPECTED_FIXED_ENTRIES = [
  { source: "crew", path: "workspace.sqlite3" },
  { source: "exports", path: "crew-tables.json" },
  { source: "exports", path: "crew-export.json" },
  { source: "exports", path: "crew-working.csv" },
];
const TABLE_CSV_RE = /^crew-table-(\d{4})\.csv$/;

function runPythonCollector(pythonExecutable, payload) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = execFile(
        pythonExecutable,
        ["-I", "-c", PYTHON_SCRIPT],
        {
          timeout: 60_000,
          maxBuffer: 192 * 1024 * 1024,
          windowsHide: true,
          env: {},
        },
        (error, stdout) => {
          if (error) {
            reject(new Error("BACKUP_LOCAL_FAILED"));
            return;
          }
          resolve(stdout);
        },
      );
    } catch {
      reject(new Error("BACKUP_LOCAL_FAILED"));
      return;
    }
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

function decodeAndValidateIpcFiles(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    fail();
  }
  if (!parsed || !Array.isArray(parsed.files)) fail();

  const entries = parsed.files;
  if (entries.length === 0 || entries.length > MAX_FILES) fail();

  const decoded = [];
  let totalBytes = 0;
  const byKey = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") fail();
    const { source, path: entryPath, base64 } = entry;
    if (source !== "crew" && source !== "exports") fail();
    if (
      typeof entryPath !== "string" ||
      entryPath.length === 0 ||
      entryPath.length > MAX_PATH_LENGTH
    )
      fail();
    if (typeof base64 !== "string" || !STRICT_BASE64_RE.test(base64)) fail();

    if (
      (base64.length / 4) * 3 -
        (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0) >
      MAX_TOTAL_BYTES - totalBytes
    )
      fail();
    const bytes = Buffer.from(base64, "base64");
    if (bytes.toString("base64") !== base64) fail();
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) fail();

    const key = `${source}/${entryPath}`;
    if (byKey.has(key)) fail();
    const file = { source, path: entryPath, bytes };
    byKey.set(key, file);
    decoded.push(file);
  }

  for (const expected of EXPECTED_FIXED_ENTRIES) {
    if (!byKey.has(`${expected.source}/${expected.path}`)) fail();
  }

  let tablesMeta;
  try {
    tablesMeta = JSON.parse(
      byKey.get("exports/crew-tables.json").bytes.toString("utf8"),
    );
  } catch {
    fail();
  }
  if (
    !Array.isArray(tablesMeta) ||
    tablesMeta.length === 0 ||
    tablesMeta.length > 9999
  )
    fail();
  const tableCount = tablesMeta.length;

  const tableIndices = new Set();
  let tableCsvCount = 0;
  for (const file of decoded) {
    if (file.source !== "exports") continue;
    const match = TABLE_CSV_RE.exec(file.path);
    if (!match) continue;
    tableCsvCount += 1;
    const idx = Number(match[1]);
    if (idx < 1 || idx > tableCount || tableIndices.has(idx)) fail();
    tableIndices.add(idx);
  }
  if (tableCsvCount !== tableCount) fail();

  const expectedTotal = EXPECTED_FIXED_ENTRIES.length + tableCount;
  if (decoded.length !== expectedTotal) fail();

  return decoded.map((file) => ({
    ...file,
    path: `${file.source}/${file.path}`,
  }));
}

async function collectCrewSnapshotInternal({
  database,
  pythonExecutable,
  parent,
}) {
  if (typeof database !== "string" || !path.isAbsolute(database)) fail();
  if (
    typeof pythonExecutable !== "string" ||
    !path.isAbsolute(pythonExecutable)
  )
    fail();
  if (typeof parent !== "string" || !path.isAbsolute(parent)) fail();

  const dbStat = await lstat(database, { bigint: true }).catch(() => fail());
  if (dbStat.isSymbolicLink() || !dbStat.isFile()) fail();

  const resolvedPython = await realpath(pythonExecutable).catch(() => fail());
  const pyStat = await lstat(resolvedPython).catch(() => fail());
  if (
    pyStat.isSymbolicLink() ||
    !pyStat.isFile() ||
    (pyStat.mode & 0o111) === 0
  )
    fail();

  const parentStat = await lstat(parent).catch(() => fail());
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) fail();

  let tempDir;
  let workspaceStat;
  let tempStat;

  try {
    tempDir = await mkdtemp(path.join(parent, ".svdt-collector-"));
    tempStat = await lstat(tempDir, { bigint: true });
    await import("node:fs/promises").then(({ chmod }) => chmod(tempDir, 0o700));

    const workspacePath = path.join(tempDir, "workspace.sqlite3");
    const handle = await open(workspacePath, "wx", 0o600);
    try {
      await handle.chmod(0o600);
      workspaceStat = await handle.stat({ bigint: true });
    } finally {
      await handle.close();
    }

    const stdout = await runPythonCollector(resolvedPython, {
      database,
      output: workspacePath,
    });

    const sourceAfter = await lstat(database, { bigint: true });
    const snapshotAfter = await lstat(workspacePath, { bigint: true });
    if (
      !sourceAfter.isFile() ||
      sourceAfter.dev !== dbStat.dev ||
      sourceAfter.ino !== dbStat.ino ||
      !snapshotAfter.isFile() ||
      snapshotAfter.dev !== workspaceStat.dev ||
      snapshotAfter.ino !== workspaceStat.ino
    )
      fail();
    const decoded = decodeAndValidateIpcFiles(stdout);

    return decoded;
  } finally {
    if (tempDir) {
      const workspacePath = path.join(tempDir, "workspace.sqlite3");
      const currentStat = await lstat(workspacePath, { bigint: true }).catch(
        () => null,
      );
      if (
        currentStat &&
        workspaceStat &&
        currentStat.isFile() &&
        currentStat.dev === workspaceStat.dev &&
        currentStat.ino === workspaceStat.ino
      ) {
        await unlink(workspacePath).catch(() => {});
      }
      const tempAfter = await lstat(tempDir, { bigint: true }).catch(
        () => null,
      );
      if (
        tempAfter?.isDirectory() &&
        tempAfter.dev === tempStat?.dev &&
        tempAfter.ino === tempStat?.ino
      )
        await rmdir(tempDir).catch(() => {});
    }
  }
}

export async function collectCrewSnapshot(options) {
  try {
    return await collectCrewSnapshotInternal(options ?? {});
  } catch {
    throw new Error("BACKUP_LOCAL_FAILED");
  }
}
