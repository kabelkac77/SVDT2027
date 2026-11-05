import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  realpathSync,
  statSync,
  truncateSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import {
  collectLocalFiles,
  collectCrewSnapshot,
} from "../tools/backup-local.js";
const PY = realpathSync(
  execFileSync("python3", ["-I", "-c", "import sys;print(sys.executable)"], {
    encoding: "utf8",
  }).trim(),
);
const MESSAGE = "BACKUP_LOCAL_FAILED";
const hash = (b) => createHash("sha256").update(b).digest("hex");
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "svdt-local-collector-"));
  return { root, clean: () => rmSync(root, { recursive: true, force: true }) };
}
function rejected(fn) {
  assert.throws(fn, (e) => e.message === MESSAGE);
}
async function rejectedAsync(fn) {
  await assert.rejects(fn, (e) => e.message === MESSAGE);
}
const INIT = String.raw`import sqlite3,json,sys
p=sys.argv[1];db=sqlite3.connect(p)
db.executescript('''CREATE TABLE meta(key text,value text); CREATE TABLE history(id text,year text,content text); CREATE TABLE categories(id text,name text,name_key text,color text,sort_order integer,version integer); CREATE TABLE working(id text,year text,category_id text,content text,source_id text,version integer,updated_at text); CREATE TABLE audit(id integer,at text,kind text,record_id text,before_json text,after_json text); CREATE TABLE requests(id text,fingerprint text,response text); CREATE TABLE extra_blob(name text,bytes blob);''')
db.execute('INSERT INTO meta VALUES(?,?)',('initialized','synthetic'))
db.execute('INSERT INTO categories VALUES(?,?,?,?,?,?)',('c','Registrace','registrace','cat-0',0,1))
for year in ['2025','2026']:db.execute('INSERT INTO history VALUES(?,?,?)',(year,year,json.dumps({'name':'Historical '+year,'raw':[{'value':'source-extra'}]})))
content={'name':'=SUM(1+2)','position':'Crew desk','owner':'Synthetic owner','email':'synthetic@example.invalid','phone':'+420 111 222 333','term':'Race','friday':'07–12','saturday':'08–18','status':'contacted','barter':'Synthetic barter','merch':'Synthetic merch','money':{'estimate':None,'agreed':0,'total':15000,'paid':None},'extra':{'original-column':'preserve'}}
db.execute('INSERT INTO working VALUES(?,?,?,?,?,?,?)',('w','2027','c',json.dumps(content,ensure_ascii=False),'s',1,'synthetic'))
db.execute('INSERT INTO audit VALUES(?,?,?,?,?,?)',(1,'synthetic','save','w',None,json.dumps(content)))
db.execute('INSERT INTO requests VALUES(?,?,?)',('r','fingerprint','response'))
db.execute('INSERT INTO extra_blob VALUES(?,?)',('blob',b'\x00\xff\x01'))
db.commit();db.close()
`;
function dbFixture(root) {
  const db = join(root, "crew.sqlite3");
  execFileSync(PY, ["-I", "-c", INIT, db], { stdio: "pipe" });
  return db;
}
function snapshot(root, db) {
  return collectCrewSnapshot({
    database: db,
    pythonExecutable: PY,
    parent: root,
  });
}
test("explicit local files preserve exact bytes and stay within their declared source", async () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, "docs"));
    writeFileSync(join(f.root, "docs", "text.md"), "Syntetický obsah");
    const bytes = Buffer.from([0, 255, 1, 2]);
    writeFileSync(join(f.root, "sheet.xlsx"), bytes);
    const rows = await collectLocalFiles(
      f.root,
      ["docs/text.md", "sheet.xlsx"],
      "inputs",
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].path, "inputs/docs/text.md");
    assert.deepEqual(rows[1].bytes, bytes);
    assert.equal(
      readFileSync(join(f.root, "docs", "text.md"), "utf8"),
      "Syntetický obsah",
    );
  } finally {
    f.clean();
  }
});
test("secrets, generated folders and traversal cannot enter explicit source inventories", async () => {
  const f = fixture();
  try {
    for (const p of [
      "../secret",
      "/tmp/secret",
      "C:/secret",
      "x\\y",
      "a//b",
      "./a",
      "a/../b",
      ".git/config",
      ".local/crew.sqlite3",
      "node_modules/x",
      ".next/x",
      "backups/x",
      ".env",
      ".env.local",
      "secret.pem",
      "secret.key",
      "keys/key.p12",
      "keys/key.pfx",
      "a/\u0001b",
    ])
      await rejectedAsync(() => collectLocalFiles(f.root, [p], "sources"));
  } finally {
    f.clean();
  }
});
test("symlink roots, intermediate directories and leaf files are rejected", async () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, "dir"));
    writeFileSync(join(f.root, "dir", "file"), "data");
    symlinkSync(join(f.root, "dir"), join(f.root, "linked"));
    symlinkSync(join(f.root, "dir", "file"), join(f.root, "leaf"));
    await rejectedAsync(() =>
      collectLocalFiles(join(f.root, "linked"), ["file"], "inputs"),
    );
    await rejectedAsync(() =>
      collectLocalFiles(f.root, ["linked/file"], "inputs"),
    );
    await rejectedAsync(() => collectLocalFiles(f.root, ["leaf"], "inputs"));
  } finally {
    f.clean();
  }
});
test("duplicates, Unicode aliases, invalid sources and empty inventories fail explicitly", async () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, "A"), "x");
    for (const args of [
      [["A", "A"], "sources"],
      [["A", "a"], "sources"],
      [["é", "e\u0301"], "inputs"],
      [[], "sources"],
      [["A"], "postgres"],
    ])
      await rejectedAsync(() => collectLocalFiles(f.root, ...args));
    await rejectedAsync(() =>
      collectLocalFiles(f.root, ["a".repeat(256)], "inputs"),
    );
    await rejectedAsync(() => collectLocalFiles(f.root, ["\ud800"], "inputs"));
  } finally {
    f.clean();
  }
});
test("missing and non-regular inputs return one constant error without path disclosure", async () => {
  const f = fixture();
  try {
    mkdirSync(join(f.root, "directory"));
    for (const p of ["missing-private-name", "directory"])
      await rejectedAsync(() => collectLocalFiles(f.root, [p], "inputs"));
  } finally {
    f.clean();
  }
});
test("crew snapshot includes history, audit, extra columns, NULL/zero and binary values", async () => {
  const f = fixture();
  try {
    const db = dbFixture(f.root),
      before = hash(readFileSync(db));
    const rows = await snapshot(f.root, db);
    assert.equal(hash(readFileSync(db)), before);
    const sqlite = rows.find((r) => r.path === "crew/workspace.sqlite3");
    assert.ok(sqlite);
    assert.deepEqual(
      sqlite.bytes.subarray(0, 16),
      Buffer.from("SQLite format 3\0"),
    );
    const tables = JSON.parse(
      rows.find((r) => r.path === "exports/crew-tables.json").bytes.toString(),
    );
    const text = JSON.stringify(tables);
    assert.match(text, /source-extra/);
    assert.match(text, /original-column/);
    assert.match(text, /2025/);
    assert.match(text, /2026/);
    assert.match(text, /2027/);
    assert.match(text, /"type":"blob"/);
    assert.match(text, /"base64":"AP8B"/);
    assert.ok(rows.some((r) => r.path === "exports/crew-working.csv"));
    assert.ok(rows.some((r) => r.path === "exports/crew-export.json"));
    assert.deepEqual(readdirSync(f.root), ["crew.sqlite3"]);
  } finally {
    f.clean();
  }
});
test("readable crew export protects spreadsheet formulas and retains actual zero and work times", async () => {
  const f = fixture();
  try {
    const rows = await snapshot(f.root, dbFixture(f.root));
    const csv = rows
      .find((r) => r.path === "exports/crew-working.csv")
      .bytes.toString("utf8");
    assert.ok(csv.startsWith("\ufeff"));
    assert.match(csv, /'=SUM\(1\+2\)/);
    assert.match(csv, /'\+420 111 222 333/);
    assert.match(csv, /07–12/);
    assert.match(csv, /08–18/);
    assert.match(csv, /Synthetic barter/);
    assert.match(csv, /Synthetic merch/);
    assert.match(csv, /(?:^|[,;])0(?:[,;]|$)/m);
  } finally {
    f.clean();
  }
});
test("snapshot is self-contained and valid when restored in a fresh directory", async () => {
  const f = fixture();
  try {
    const rows = await snapshot(f.root, dbFixture(f.root));
    const restored = join(f.root, "restored.sqlite3");
    writeFileSync(
      restored,
      rows.find((r) => r.path === "crew/workspace.sqlite3").bytes,
      { mode: 0o600 },
    );
    const output = execFileSync(
      PY,
      [
        "-I",
        "-c",
        'import sqlite3,sys,json;c=sqlite3.connect(sys.argv[1]);print(json.dumps([c.execute("pragma integrity_check").fetchone()[0],c.execute("select count(*) from audit").fetchone()[0],c.execute("select count(*) from history").fetchone()[0]]))',
        restored,
      ],
      { encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(output), ["ok", 1, 2]);
  } finally {
    f.clean();
  }
});
test("invalid or incomplete SQLite never becomes a successful source and preserves unrelated files", async () => {
  const f = fixture();
  try {
    const db = join(f.root, "invalid.sqlite3");
    writeFileSync(db, "not sqlite");
    writeFileSync(join(f.root, "keep.txt"), "preserve");
    await rejectedAsync(() => snapshot(f.root, db));
    assert.equal(readFileSync(join(f.root, "keep.txt"), "utf8"), "preserve");
    assert.deepEqual(readdirSync(f.root).sort(), [
      "invalid.sqlite3",
      "keep.txt",
    ]);
  } finally {
    f.clean();
  }
});
test("missing, symlinked database or failed Python process never modifies the source", async () => {
  const f = fixture();
  try {
    const db = dbFixture(f.root),
      before = hash(readFileSync(db));
    symlinkSync(db, join(f.root, "linked.sqlite3"));
    await rejectedAsync(() => snapshot(f.root, join(f.root, "linked.sqlite3")));
    await rejectedAsync(() => snapshot(f.root, join(f.root, "missing")));
    await rejectedAsync(() =>
      collectCrewSnapshot({
        database: db,
        pythonExecutable: "/bin/false",
        parent: f.root,
      }),
    );
    assert.equal(hash(readFileSync(db)), before);
    assert.deepEqual(readdirSync(f.root).sort(), [
      "crew.sqlite3",
      "linked.sqlite3",
    ]);
  } finally {
    f.clean();
  }
});
test("a live WAL database includes all committed data without changing source database or WAL", async () => {
  const f = fixture();
  let child;
  try {
    const db = dbFixture(f.root);
    child = spawn(
      PY,
      [
        "-I",
        "-u",
        "-c",
        String.raw`import sqlite3,sys,json
c=sqlite3.connect(sys.argv[1]);c.execute('pragma journal_mode=wal');c.execute('update working set version=2');c.commit();print('READY',flush=True);sys.stdin.read();c.close()
`,
        db,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const [ready] = await once(child.stdout, "data");
    assert.match(ready.toString(), /READY/);
    const main = hash(readFileSync(db)),
      wal = hash(readFileSync(db + "-wal"));
    const rows = await snapshot(f.root, db);
    assert.equal(hash(readFileSync(db)), main);
    assert.equal(hash(readFileSync(db + "-wal")), wal);
    const restored = join(f.root, "restored.sqlite3");
    writeFileSync(
      restored,
      rows.find((r) => r.path === "crew/workspace.sqlite3").bytes,
    );
    const version = execFileSync(
      PY,
      [
        "-I",
        "-c",
        'import sqlite3,sys;print(sqlite3.connect(sys.argv[1]).execute("select version from working").fetchone()[0])',
        restored,
      ],
      { encoding: "utf8" },
    );
    assert.equal(version.trim(), "2");
  } finally {
    if (child) {
      child.stdin.end();
      await once(child, "close");
    }
    f.clean();
  }
});

test("large sparse files are rejected by size before allocating their contents", async () => {
  const f = fixture();
  try {
    const file = join(f.root, "large.bin");
    writeFileSync(file, "");
    truncateSync(file, 128 * 1024 * 1024 + 1);
    await rejectedAsync(() =>
      collectLocalFiles(f.root, ["large.bin"], "inputs"),
    );
  } finally {
    f.clean();
  }
});
test("all user tables, generated columns and formula-like CSV headers remain included", async () => {
  const f = fixture();
  try {
    const db = dbFixture(f.root);
    execFileSync(PY, [
      "-I",
      "-c",
      String.raw`import sqlite3,sys
c=sqlite3.connect(sys.argv[1]);c.execute('CREATE TABLE sqliteextra(a integer,b integer GENERATED ALWAYS AS (a+1))');c.execute('INSERT INTO sqliteextra(a) VALUES(2)');c.execute('CREATE TABLE formula("=HYPERLINK" text)');c.execute('INSERT INTO formula VALUES(?)',('ordinary',));c.commit();c.close()
`,
      db,
    ]);
    const rows = await snapshot(f.root, db);
    const tables = JSON.parse(
      rows.find((r) => r.path === "exports/crew-tables.json").bytes,
    );
    const extra = tables.find((t) => t.name === "sqliteextra");
    assert.deepEqual(extra.columns, ["a", "b"]);
    assert.deepEqual(extra.rows, [[2, 3]]);
    const ix = tables.findIndex((t) => t.name === "formula") + 1;
    const csv = rows
      .find(
        (r) =>
          r.path ===
          "exports/crew-table-" + String(ix).padStart(4, "0") + ".csv",
      )
      .bytes.toString();
    assert.match(csv, /'=HYPERLINK/);
  } finally {
    f.clean();
  }
});
test("non-text initialization metadata cannot masquerade as a valid crew database", async () => {
  const f = fixture();
  try {
    const db = dbFixture(f.root);
    execFileSync(PY, [
      "-I",
      "-c",
      "import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.execute('update meta set value=NULL');c.commit();c.close()",
      db,
    ]);
    await rejectedAsync(() => snapshot(f.root, db));
    assert.deepEqual(readdirSync(f.root), ["crew.sqlite3"]);
  } finally {
    f.clean();
  }
});
test("failed collection cleans its own snapshot and leaves foreign additions in a private directory", async () => {
  const f = fixture();
  try {
    const db = dbFixture(f.root);
    const wrapper = join(f.root, "synthetic-python");
    writeFileSync(
      wrapper,
      "#!" +
        PY +
        '\nimport sys,json,os,stat\np=json.load(sys.stdin);d=os.path.dirname(p["output"]);open(os.path.join(d,"foreign.txt"),"x").write(str(stat.S_IMODE(os.stat(d).st_mode))+","+str(stat.S_IMODE(os.stat(p["output"]).st_mode)))\nsys.exit(1)\n',
      { mode: 0o700 },
    );
    await rejectedAsync(() =>
      collectCrewSnapshot({
        database: db,
        pythonExecutable: wrapper,
        parent: f.root,
      }),
    );
    const folder = readdirSync(f.root).find((n) =>
      n.startsWith(".svdt-collector-"),
    );
    assert.ok(folder);
    assert.deepEqual(readdirSync(join(f.root, folder)), ["foreign.txt"]);
    assert.equal(
      readFileSync(join(f.root, folder, "foreign.txt"), "utf8"),
      "448,384",
    );
  } finally {
    f.clean();
  }
});
