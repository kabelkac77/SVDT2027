import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  collectLocalFiles,
  collectCrewSnapshot,
} from "../tools/backup-local.js";
import { collectPostgres } from "../tools/backup-postgres.js";
import { runBackup } from "../tools/backup-runner.js";
import { readBackup, restoreBackupExclusive } from "../tools/backup-bundle.js";
const PY = realpathSync(
  execFileSync("python3", ["-I", "-c", "import sys;print(sys.executable)"], {
    encoding: "utf8",
  }).trim(),
);
const REL = [
  "auth.users",
  "auth.identities",
  "storage.buckets",
  "storage.objects",
  "public.events",
  "public.editions",
  "public.edition_members",
];
function setup() {
  const root = mkdtempSync(join(tmpdir(), "svdt-six-source-flow-"));
  const workspace = join(root, "workspace");
  const tool = new URL("../tools/crew_workspace.py", import.meta.url).pathname;
  execFileSync(
    PY,
    [
      "-I",
      "-c",
      `import importlib.util,sys,json\ns=importlib.util.spec_from_file_location('crew',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);w=m.CrewStore(sys.argv[2],json.loads(sys.stdin.read()));w.db.close()`,
      tool,
      workspace,
    ],
    {
      input: JSON.stringify({
        sourceSha256: "synthetic",
        records: [
          {
            id: "source-1",
            year: "2026",
            category: "Registrace",
            name: "Fiktivní integrace",
            position: "Registrace",
            email: "synthetic@example.invalid",
            raw: [{ column: "extra", value: "retain-original" }],
          },
        ],
      }),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  writeFileSync(join(root, "source.js"), "export const synthetic=true;");
  writeFileSync(
    join(root, "input.json"),
    JSON.stringify({ unknown: null, zero: 0 }),
  );
  writeFileSync(
    join(root, "pgservice.conf"),
    "[synthetic]\nhost=synthetic.invalid\n",
    { mode: 0o600 },
  );
  writeFileSync(join(root, "pgpass.conf"), "synthetic", { mode: 0o600 });
  for (const kind of ["dump", "restore"]) {
    writeFileSync(
      join(root, "pg_" + kind),
      `#!${process.execPath}\nconst fs=require('node:fs'),args=process.argv.slice(2);if(args.includes('--version')){console.log('pg_${kind} (PostgreSQL) 17.6')}else if('${kind}'==='dump'){fs.writeFileSync(args.find(x=>x.startsWith('--file=')).slice(7),Buffer.from('PGDMPsynthetic'))}else{console.log(${JSON.stringify(REL.map((r, i) => `${i + 1}; 0 100 TABLE DATA ${r.replace(".", " ")} synthetic`).join("\n"))})}`,
      { mode: 0o700 },
    );
  }
  const objectBytes = Buffer.from([0, 255, 5]),
    inventory = {
      complete: true,
      buckets: [
        {
          id: "crew",
          objects: [
            {
              key: "attachment.bin",
              id: "o1",
              updated_at: "fixed",
              size: objectBytes.length,
            },
          ],
        },
      ],
    };
  const collector = (sources, fn) => ({
    sources,
    collect: async () => ({ complete: true, files: await fn() }),
  });
  const collectors = [
    collector(["crew", "exports"], () =>
      collectCrewSnapshot({
        database: join(workspace, "crew.sqlite3"),
        pythonExecutable: PY,
        parent: root,
      }),
    ),
    collector(["sources"], () =>
      collectLocalFiles(root, ["source.js"], "sources"),
    ),
    collector(["inputs"], () =>
      collectLocalFiles(root, ["input.json"], "inputs"),
    ),
    collector(["postgres"], () =>
      collectPostgres({
        pgDumpExecutable: join(root, "pg_dump"),
        pgRestoreExecutable: join(root, "pg_restore"),
        service: "synthetic",
        serviceFile: join(root, "pgservice.conf"),
        passFile: join(root, "pgpass.conf"),
        parent: root,
        requiredRelations: REL,
      }),
    ),
    collector(["storage"], async () => [
      {
        source: "storage",
        path: "storage/objects/00000001.bin",
        bytes: objectBytes,
      },
      {
        source: "storage",
        path: "storage/inventory.json",
        bytes: Buffer.from(JSON.stringify(inventory)),
      },
    ]),
  ];
  const remote = new Map(),
    key = Buffer.alloc(32, 42);
  let released = 0;
  const options = {
    collectors,
    key,
    lockPath: join(root, "backup.lock"),
    consistency: {
      acquire: async () => async () => {
        released++;
      },
    },
    destination: {
      kind: "remote",
      putExclusive: async (id, bytes) => {
        if (remote.has(id)) throw Error("exists");
        remote.set(id, Buffer.from(bytes));
      },
      read: async (id) => Buffer.from(remote.get(id)),
    },
  };
  return {
    root,
    key,
    options,
    remote,
    objectBytes,
    get released() {
      return released;
    },
    clean: () => rmSync(root, { recursive: true, force: true }),
  };
}
test("synthetic six-source flow collects real SQLite and restores data through real encryption; PG executable, Storage collector and remote are explicit fixtures", async () => {
  const f = setup();
  try {
    const result = await runBackup(f.options),
      bundle = f.remote.get(result.id),
      manifest = readBackup(bundle, f.key);
    assert.equal(result.remoteReadbackVerified, true);
    assert.equal(f.released, 1);
    for (const name of [
      "sources",
      "crew",
      "inputs",
      "postgres",
      "storage",
      "exports",
    ])
      assert.ok(manifest.sources.find((s) => s.name === name).fileCount > 0);
    const target = join(f.root, "restore");
    restoreBackupExclusive(target, bundle, f.key);
    assert.deepEqual(
      JSON.parse(readFileSync(join(target, "inputs/input.json"), "utf8")),
      { unknown: null, zero: 0 },
    );
    assert.deepEqual(
      readFileSync(join(target, "storage/objects/00000001.bin")),
      f.objectBytes,
    );
    const db = join(target, "crew/workspace.sqlite3");
    const check = JSON.parse(
      execFileSync(
        PY,
        [
          "-I",
          "-c",
          'import sqlite3,sys,json;c=sqlite3.connect(sys.argv[1]);print(json.dumps([c.execute("pragma integrity_check").fetchone()[0],c.execute("select count(*) from history").fetchone()[0],c.execute("select distinct year from working").fetchone()[0]]))',
          db,
        ],
        { encoding: "utf8" },
      ),
    );
    assert.deepEqual(check, ["ok", 1, "2027"]);
    assert.equal(existsSync(join(f.root, "backup.lock")), false);
  } finally {
    f.clean();
  }
});
test("real local collector failure cannot upload a partially collected synthetic six-source backup", async () => {
  const f = setup();
  try {
    f.options.collectors[2].collect = async () => ({
      complete: true,
      files: await collectLocalFiles(
        f.root,
        ["missing-private-input"],
        "inputs",
      ),
    });
    await assert.rejects(
      () => runBackup(f.options),
      (e) => e.message === "BACKUP_JOB_FAILED",
    );
    assert.equal(f.remote.size, 0);
    assert.equal(f.released, 1);
    assert.equal(existsSync(join(f.root, "backup.lock")), false);
  } finally {
    f.clean();
  }
});
