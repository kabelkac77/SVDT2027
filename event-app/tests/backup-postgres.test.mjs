import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  chmodSync,
  symlinkSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { collectPostgres } from "../tools/backup-postgres.js";
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
const fail = (fn) =>
  assert.rejects(fn, (e) => e.message === "BACKUP_POSTGRES_FAILED");
function fixture(scenario = {}) {
  const root = mkdtempSync(join(tmpdir(), "svdt-pg-collector-")),
    trace = join(root, "trace.jsonl"),
    serviceFile = join(root, "services.conf"),
    passFile = join(root, "pass.conf");
  writeFileSync(serviceFile, "[synthetic]\nhost=synthetic.invalid\n", {
    mode: 0o600,
  });
  writeFileSync(passFile, "synthetic-only", { mode: 0o600 });
  const config = { trace, relations: REL, ...scenario };
  const payload = JSON.stringify(JSON.stringify(config));
  for (const kind of ["dump", "restore"]) {
    const file = join(root, "pg-" + kind);
    writeFileSync(
      file,
      `#!${PY}\nimport sys,os,json\ns=json.loads(${payload});kind=${JSON.stringify(kind)}\nwith open(s['trace'],'a') as t:t.write(json.dumps({'kind':kind,'args':sys.argv[1:],'env':dict(os.environ)})+'\\n')\nif '--version' in sys.argv:\n print('pg_'+kind+' (PostgreSQL) '+str(s.get(kind+'Version','17.6')))\n if s.get('versionWarning'):print('synthetic warning',file=sys.stderr)\n sys.exit(0)\nif s.get(kind+'Failure'):print('PRIVATE-ERROR',file=sys.stderr);sys.exit(2)\nif kind=='dump':\n dest=next(a.split('=',1)[1] for a in sys.argv if a.startswith('--file='))\n if s.get('replaceOutput'):os.rename(dest,dest+'.original')\n with open(dest,'wb') as f:\n  f.write(b'INVALID' if s.get('invalidMagic') else b'PGDMPsynthetic-archive')\n  if s.get('oversize'):f.truncate(128*1024*1024+1)\n if s.get('dumpWarning'):print('PRIVATE-WARNING',file=sys.stderr)\nelse:\n if s.get('tocWarning'):print('PRIVATE-TOC-WARNING',file=sys.stderr)\n for i,rel in enumerate(s['relations']):\n  if rel==s.get('omit'):continue\n  schema,table=rel.split('.')\n  print(('# ' if s.get('commentsOnly') else '')+str(i+1)+'; 0 100 TABLE DATA '+schema+' '+table+' synthetic_owner')\n`,
      { mode: 0o700 },
    );
  }
  return {
    root,
    trace,
    options: {
      pgDumpExecutable: join(root, "pg-dump"),
      pgRestoreExecutable: join(root, "pg-restore"),
      service: "synthetic",
      serviceFile,
      passFile,
      parent: root,
      requiredRelations: [...REL],
    },
    clean: () => rmSync(root, { recursive: true, force: true }),
  };
}
test("full custom dump preserves every declared required relation and records verification limits", async () => {
  const f = fixture();
  try {
    const rows = await collectPostgres(f.options),
      dump = rows.find((r) => r.path === "postgres/database.dump"),
      meta = JSON.parse(
        rows.find((r) => r.path === "postgres/manifest.json").bytes,
      );
    assert.deepEqual(dump.bytes, Buffer.from("PGDMPsynthetic-archive"));
    assert.equal(
      meta.sha256,
      createHash("sha256").update(dump.bytes).digest("hex"),
    );
    assert.equal(meta.fullDatabase, true);
    assert.equal(meta.serverRolesIncluded, false);
    assert.equal(meta.storageObjectsIncluded, false);
    assert.equal(meta.restoreTested, false);
    assert.deepEqual([...meta.requiredRelations].sort(), [...REL].sort());
    assert.ok(!readdirSync(f.root).some((n) => n.startsWith(".svdt")));
  } finally {
    f.clean();
  }
});
test("commands use the explicit service alias, preserve ACL and never receive ambient secrets", async () => {
  const f = fixture();
  const old = process.env.PGPASSWORD;
  process.env.PGPASSWORD = "PRIVATE-AMBIENT-SECRET";
  try {
    await collectPostgres(f.options);
    const trace = readFileSync(f.trace, "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(trace.length, 4);
    const dump = trace.find(
      (r) => r.kind === "dump" && !r.args.includes("--version"),
    );
    assert.ok(dump.args.includes("--dbname=service=synthetic"));
    assert.ok(dump.args.includes("--format=custom"));
    assert.ok(dump.args.includes("--no-password"));
    assert.ok(
      !dump.args.some((a) =>
        /enable-row-security|data-only|schema-only|no-acl|schema=|table=/.test(
          a,
        ),
      ),
    );
    for (const entry of trace) {
      assert.equal(entry.env.PGPASSWORD, undefined);
      assert.equal(entry.env.HOME, undefined);
      assert.equal(entry.env.PGSERVICEFILE, f.options.serviceFile);
      assert.equal(entry.env.PGPASSFILE, f.options.passFile);
      assert.equal(entry.env.PGAPPNAME, "svdt-backup");
      assert.ok(!JSON.stringify(entry.args).includes("PRIVATE-"));
    }
  } finally {
    if (old === undefined) delete process.env.PGPASSWORD;
    else process.env.PGPASSWORD = old;
    f.clean();
  }
});
test("a missing required TABLE DATA item cannot be replaced by schema-only entries or comments", async () => {
  for (const scenario of [{ omit: "auth.users" }, { commentsOnly: true }]) {
    const f = fixture(scenario);
    try {
      await fail(() => collectPostgres(f.options));
    } finally {
      f.clean();
    }
  }
});
test("PostgreSQL warnings and failed commands are not reported as successful complete dumps", async () => {
  for (const scenario of [
    { versionWarning: true },
    { dumpWarning: true },
    { tocWarning: true },
    { dumpFailure: true },
    { restoreFailure: true },
  ]) {
    const f = fixture(scenario);
    try {
      await fail(() => collectPostgres(f.options));
      assert.ok(!readdirSync(f.root).some((n) => n.startsWith(".svdt")));
    } finally {
      f.clean();
    }
  }
});
test("incompatible or malformed tool versions are refused before collection", async () => {
  for (const scenario of [
    { restoreVersion: "18.0" },
    { dumpVersion: "invalid" },
    { dumpVersion: "PRIVATE 17.6" },
  ]) {
    const f = fixture(scenario);
    try {
      await fail(() => collectPostgres(f.options));
    } finally {
      f.clean();
    }
  }
});
test("invalid magic and oversized output do not reach a successful backup result", async () => {
  for (const scenario of [{ invalidMagic: true }, { oversize: true }]) {
    const f = fixture(scenario);
    try {
      await fail(() => collectPostgres(f.options));
    } finally {
      f.clean();
    }
  }
});
test("credential files must be private regular files owned by the caller", async () => {
  const f = fixture();
  try {
    chmodSync(f.options.passFile, 0o644);
    await fail(() => collectPostgres(f.options));
    chmodSync(f.options.passFile, 0o600);
    symlinkSync(f.options.passFile, join(f.root, "linked"));
    await fail(() =>
      collectPostgres({ ...f.options, passFile: join(f.root, "linked") }),
    );
    assert.ok(!readdirSync(f.root).some((n) => n.startsWith(".svdt")));
  } finally {
    f.clean();
  }
});
test("invalid aliases, relations and relative configuration are rejected without starting a process", async () => {
  const f = fixture();
  try {
    for (const patch of [
      { service: "synthetic password=bad" },
      { requiredRelations: REL.slice(1) },
      { requiredRelations: [...REL, "public.x;drop"] },
      { requiredRelations: [...REL, "auth.users"] },
      { serviceFile: "relative" },
    ])
      await fail(() => collectPostgres({ ...f.options, ...patch }));
    assert.ok(!readdirSync(f.root).includes("trace.jsonl"));
  } finally {
    f.clean();
  }
});
test("replacing the exclusive output inode is detected and foreign bytes are preserved", async () => {
  const f = fixture({ replaceOutput: true });
  try {
    await fail(() => collectPostgres(f.options));
    const temp = readdirSync(f.root).find((n) => n.startsWith(".svdt"));
    assert.ok(temp);
    assert.ok(readdirSync(join(f.root, temp)).includes("database.dump"));
  } finally {
    f.clean();
  }
});
