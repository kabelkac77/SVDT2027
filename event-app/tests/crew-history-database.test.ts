import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const uid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const e1 = uid(101),
  e2 = uid(102),
  c1 = uid(201),
  c2 = uid(202),
  r1 = uid(301),
  r2 = uid(302),
  r3 = uid(303),
  pkg = uid(401);
const admin = uid(1),
  coord = uid(2),
  finance = uid(3),
  member = uid(4),
  otherAdmin = uid(5),
  outsider = uid(6),
  partner = uid(7);
const payload = (): any[] => [
  {
    name: "meta",
    columns: ["key", "value"],
    rows: [["initialized", "synthetic"]],
  },
  {
    name: "working",
    columns: ["id", "year", "source_id", "content"],
    rows: [
      [
        "w1",
        "2027",
        "h1",
        '{"name":"PRIVATE-SYNTHETIC","money":{"agreed":0,"paid":null}}',
      ],
      ["w2", "2027", null, '{"name":"PRIVATE-SYNTHETIC"}'],
    ],
  },
  {
    name: "history",
    columns: ["id", "year", "content"],
    rows: [
      ["h1", "2026", '{"raw":[{"value":"PRIVATE-SYNTHETIC-CASH"}]}'],
      ["h2", "2025", '{"raw":[]}'],
    ],
  },
  { name: "categories", columns: ["id"], rows: [["c"]] },
  {
    name: "audit",
    columns: ["id", "after_json"],
    rows: [[1, "PRIVATE-SYNTHETIC-AUDIT"]],
  },
  {
    name: "requests",
    columns: ["id", "response"],
    rows: [["request", "PRIVATE-SYNTHETIC-REQUEST"]],
  },
  {
    name: "extra_blob",
    columns: ["value"],
    rows: [[{ type: "blob", base64: "AP8=" }]],
  },
];
const text = () => JSON.stringify(payload(), null, 2) + "\n";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
async function setup() {
  const db = new PGlite();
  await db.exec(
    "create schema auth;create table auth.users(id uuid primary key,email text);create role anon nologin;create role authenticated nologin;grant usage on schema public,auth to authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
  );
  for (const name of [
    "202609280001_partners.sql",
    "202609290001_partner_history.sql",
    "202611020001_crew.sql",
    "202611020002_operations.sql",
    "202611050001_crew_transfer.sql",
    "202611050002_crew_import.sql",
    "202611120001_crew_history.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  for (let n = 1; n <= 7; n++)
    await db.query("insert into auth.users values($1,$2)", [
      uid(n),
      "synthetic" + n + "@example.invalid",
    ]);
  await db.exec(
    `insert into events(id,name) values('${uid(100)}','Synthetic');insert into editions(id,event_id,year,name) values('${e1}','${uid(100)}',2027,'Synthetic A'),('${e2}','${uid(100)}',2028,'Synthetic B');insert into edition_members values('${e1}','${admin}','Admin','admin'),('${e2}','${otherAdmin}','Other','admin'),('${e1}','${partner}','Partner','viewer');insert into crew_members values('${e1}','${coord}','coordinator',true,false,1),('${e1}','${finance}','coordinator',true,true,1),('${e1}','${member}','member',true,false,1);insert into crew_categories(id,edition_id,name) values('${c1}','${e1}','Synthetic A'),('${c2}','${e2}','Synthetic B');insert into crew_roster(id,edition_id,category_id,name) values('${r1}','${e1}','${c1}','Synthetic 1'),('${r2}','${e1}','${c1}','Synthetic 2'),('${r3}','${e2}','${c2}','Synthetic 3');`,
  );
  return db;
}
async function owner(db: PGlite, id = admin) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function client(db: PGlite, id = admin) {
  await owner(db, id);
  await db.exec("set role authenticated");
}
async function capture(
  db: PGlite,
  source = text(),
  id = pkg,
  hash = sha(source),
  edition = e1,
) {
  return (
    await db.query<any>(
      "insert into crew_transfer_packages(id,edition_id,source_sha256,source_text,actor_id,created_at) values($1,$2,$3,$4,$5,$6) returning *",
      [id, edition, hash, source, otherAdmin, "1980-01-01T00:00:00Z"],
    )
  ).rows[0];
}
async function link(
  db: PGlite,
  row = "w1",
  roster = r1,
  history: string | null = "h1",
  packageId = pkg,
  edition = e1,
) {
  return (
    await db.query<any>(
      "insert into crew_transfer_links(package_id,edition_id,source_row_id,roster_id,source_history_id,actor_id) values($1,$2,$3,$4,$5,$6) returning *",
      [packageId, edition, row, roster, history, otherAdmin],
    )
  ).rows[0];
}
async function count(db: PGlite, table: string) {
  return (await db.query<any>("select count(*)::int n from " + table)).rows[0]
    .n;
}

async function index(db: PGlite, edition = e1, roster = r1) {
  return (
    await db.query<any>("select crew_transfer_history_index($1,$2) data", [
      edition,
      roster,
    ])
  ).rows[0].data;
}
async function history(db: PGlite, edition = e1, roster = r1, packageId = pkg) {
  return (
    await db.query<any>("select crew_transfer_history_row($1,$2,$3) data", [
      edition,
      roster,
      packageId,
    ])
  ).rows[0].data;
}
test("admin gets only explicit source metadata and original selected row/history without mutations", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = text();
    await capture(db, source);
    await link(db);
    const beforeAudit = await count(db, "crew_audit");
    await client(db);
    const list = await index(db);
    assert.equal(list.sources.length, 1);
    assert.equal(list.sources[0].packageId, pkg);
    assert.equal(list.sources[0].capturedBy, admin);
    assert.equal(list.sources[0].sourceSha256, sha(source));
    assert.doesNotMatch(JSON.stringify(list), /PRIVATE-SYNTHETIC/);
    const out = await history(db);
    assert.equal(out.sourceRow.id, "w1");
    assert.equal(out.sourceRow.year, "2027");
    assert.equal(out.historyRow.id, "h1");
    assert.equal(out.historyRow.year, "2026");
    assert.equal(out.sourceRow.content, payload()[1].rows[0][3]);
    assert.equal(out.historyRow.content, payload()[2].rows[0][2]);
    assert.equal(JSON.parse(out.sourceRow.content).money.agreed, 0);
    assert.equal(JSON.parse(out.sourceRow.content).money.paid, null);
    assert.equal("source_text" in out, false);
    assert.equal("sourceText" in out, false);
    await owner(db);
    assert.equal(await count(db, "crew_audit"), beforeAudit);
    assert.equal(await count(db, "crew_requests"), 0);
  } finally {
    await db.close();
  }
});
test("coordinator, financial coordinator, member, viewer, outsider and other edition admin cannot read original sources", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    for (const id of [coord, finance, member, partner, outsider, otherAdmin]) {
      await client(db, id);
      await assert.rejects(index(db), /CREW_HISTORY_ACCESS_DENIED/);
      await assert.rejects(history(db), /CREW_HISTORY_ACCESS_DENIED/);
    }
  } finally {
    await db.close();
  }
});
test("row/package selection cannot disclose another row or edition and unlinked roster has empty metadata", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await client(db);
    assert.deepEqual((await index(db, e1, r2)).sources, []);
    await assert.rejects(history(db, e1, r2), /CREW_HISTORY_NOT_FOUND/);
    await assert.rejects(
      history(db, e1, r1, uid(999)),
      /CREW_HISTORY_NOT_FOUND/,
    );
    await assert.rejects(index(db, e1, r3), /CREW_HISTORY_NOT_FOUND/);
    await assert.rejects(history(db, e2, r3), /CREW_HISTORY_ACCESS_DENIED/);
    await assert.rejects(history(db, e1, uid(999)), /CREW_HISTORY_NOT_FOUND/);
  } finally {
    await db.close();
  }
});
test("no source history is explicit null and original strings remain data", async () => {
  const db = await setup();
  try {
    await owner(db);
    const data = payload();
    data[1].rows[1][3] = "<script>do not execute</script> PRIVATE-SYNTHETIC";
    await capture(db, JSON.stringify(data));
    await link(db, "w2", r2, null);
    await client(db);
    const out = await history(db, e1, r2);
    assert.equal(out.historyRow, null);
    assert.equal(out.sourceRow.source_id, null);
    assert.equal(out.sourceRow.content, data[1].rows[1][3]);
    assert.equal((await index(db, e1, r2)).sources[0].sourceHistoryId, null);
  } finally {
    await db.close();
  }
});
test("archived edition history stays read-only accessible to its admin and role removal takes effect on next call", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await db.query("update editions set archived=true where id=$1", [e1]);
    await client(db);
    await db.exec("begin read only");
    assert.equal((await history(db)).historyRow.year, "2026");
    assert.equal((await index(db)).sources.length, 1);
    await db.exec("commit");
    await owner(db);
    await db.query(
      "update edition_members set role=$1 where edition_id=$2 and user_id=$3",
      ["viewer", e1, admin],
    );
    await client(db);
    await assert.rejects(index(db), /CREW_HISTORY_ACCESS_DENIED/);
    await assert.rejects(history(db), /CREW_HISTORY_ACCESS_DENIED/);
  } finally {
    await db.close();
  }
});
test("history RPCs are stable guarded reads, no public/anon execute and private parser remains denied", async () => {
  const db = await setup();
  try {
    await owner(db);
    const rows = (
      await db.query<any>(
        "select p.proname,p.provolatile,p.prosecdef,has_function_privilege('authenticated',p.oid,'execute') client,has_function_privilege('anon',p.oid,'execute') anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('crew_transfer_history_index','crew_transfer_history_row')",
      )
    ).rows;
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.provolatile, "s");
      assert.equal(row.prosecdef, true);
      assert.equal(row.client, true);
      assert.equal(row.anon, false);
    }
    await client(db);
    await assert.rejects(
      db.query("select crew_transfer_source_row($1,$2,$3)", [
        text(),
        "working",
        "w1",
      ]),
      /permission denied/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(index(db), /permission denied/);
    await assert.rejects(history(db), /permission denied/);
  } finally {
    await db.close();
  }
});
