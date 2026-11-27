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

test("multiple original packages stay distinct, ordered deterministically and require explicit selection", async () => {
  const db = await setup();
  try {
    await owner(db);
    const first = payload(),
      second = payload();
    first[1].rows[0][3] = "FIRST-SYNTHETIC-SOURCE";
    second[1].rows[0][3] = "SECOND-SYNTHETIC-SOURCE";
    first[1].rows[1][3] = second[1].rows[1][3] = "UNSELECTED-SYNTHETIC-ROW";
    const high = uid(403),
      low = uid(402);
    await db.exec("begin");
    await capture(db, JSON.stringify(first), high);
    await link(db, "w1", r1, "h1", high);
    await capture(db, JSON.stringify(second), low);
    await link(db, "w1", r1, "h1", low);
    await db.exec("commit");
    await client(db);
    const list = await index(db);
    assert.deepEqual(
      list.sources.map((s: any) => s.packageId),
      [low, high],
    );
    assert.equal(list.sources[0].capturedAt, list.sources[1].capturedAt);
    assert.doesNotMatch(JSON.stringify(list), /SYNTHETIC-SOURCE|UNSELECTED/);
    for (const [id, content] of [
      [high, "FIRST-SYNTHETIC-SOURCE"],
      [low, "SECOND-SYNTHETIC-SOURCE"],
    ]) {
      const selected = await history(db, e1, r1, id);
      assert.equal(selected.packageId, id);
      assert.equal(selected.sourceRow.content, content);
      assert.doesNotMatch(JSON.stringify(selected), /UNSELECTED-SYNTHETIC-ROW/);
    }
    assert.deepEqual((await index(db, e1, r2)).sources, []);
    await assert.rejects(history(db, e1, r2, low), /CREW_HISTORY_NOT_FOUND/);
  } finally {
    await db.close();
  }
});

test("original unknown columns retain null, zero, booleans, blob markers and exact text", async () => {
  const db = await setup();
  try {
    await owner(db);
    const data = payload();
    const content =
      '  {"note":"<script>synthetic</script>","label":"PÁ / SO žluťoučký"}\n';
    data[1].rows[0][3] = content;
    data[1].columns.push("nullable", "zero", "flag", "blob", "future");
    for (const row of data[1].rows)
      row.push(
        null,
        0,
        false,
        { type: "blob", base64: "AP8=" },
        { nested: [null, 0, "synthetic"] },
      );
    data[2].columns.push("original_note");
    data[2].rows[0].push("\nSYNTHETIC HISTORY 2026\t");
    data[2].rows[1].push("UNSELECTED-HISTORY-2025");
    await capture(db, JSON.stringify(data));
    await link(db);
    await client(db);
    const out = await history(db);
    assert.deepEqual(
      out.sourceRow,
      Object.fromEntries(
        data[1].columns.map((c: string, i: number) => [c, data[1].rows[0][i]]),
      ),
    );
    assert.deepEqual(
      out.historyRow,
      Object.fromEntries(
        data[2].columns.map((c: string, i: number) => [c, data[2].rows[0][i]]),
      ),
    );
    assert.equal(out.sourceRow.content, content);
    assert.doesNotMatch(JSON.stringify(out), /UNSELECTED-HISTORY-2025/);
    assert.doesNotMatch(
      JSON.stringify(await index(db)),
      /SYNTHETIC HISTORY|original_note|base64/,
    );
  } finally {
    await db.close();
  }
});

test("expired or absent auth denies known and guessed history without returning source content", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await client(db);
    assert.equal((await index(db)).sources.length, 1);
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    for (const run of [
      () => index(db),
      () => history(db),
      () => index(db, e1, uid(999)),
      () => history(db, e1, r1, uid(999)),
    ])
      await assert.rejects(run, (err: any) => {
        assert.equal(err.code, "42501");
        assert.match(err.message, /CREW_HISTORY_ACCESS_DENIED/);
        assert.doesNotMatch(err.message, /PRIVATE-SYNTHETIC/);
        return true;
      });
  } finally {
    await db.close();
  }
});

test("admin of a different year cannot turn 2028 data into source history for 2027", async () => {
  const db = await setup();
  try {
    await client(db, otherAdmin);
    assert.equal(
      (await db.query<any>("select public.crew_role($1) role", [e2])).rows[0]
        .role,
      "admin",
    );
    await assert.rejects(index(db, e2, r3), /CREW_HISTORY_NOT_FOUND/);
    await assert.rejects(history(db, e2, r3), /CREW_HISTORY_NOT_FOUND/);
    await assert.rejects(index(db, e1, r1), /CREW_HISTORY_ACCESS_DENIED/);
  } finally {
    await db.close();
  }
});

test("successful and denied reads leave every public table and auth identity unchanged", async () => {
  const db = await setup();
  async function snapshot() {
    await owner(db);
    const tables = (
      await db.query<{ tablename: string }>(
        "select tablename from pg_tables where schemaname='public' order by tablename",
      )
    ).rows;
    const state: Record<string, unknown> = {};
    for (const { tablename } of tables) {
      assert.match(tablename, /^[a-z_]+$/);
      state[tablename] = (
        await db.query<any>(
          `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) data from public.${tablename} t`,
        )
      ).rows[0].data;
    }
    state["auth.users"] = (
      await db.query<any>(
        "select jsonb_agg(to_jsonb(t) order by id) data from auth.users t",
      )
    ).rows[0].data;
    return state;
  }
  try {
    await owner(db);
    await capture(db);
    await link(db);
    const before = await snapshot();
    // All 26 application tables plus the synthetic Auth users table. This
    // fixture does not implement platform Auth identities or Storage tables.
    assert.equal(Object.keys(before).length, 27);
    await client(db);
    await db.exec("begin read only");
    for (let i = 0; i < 3; i++) {
      await index(db);
      await history(db);
    }
    await db.exec("commit");
    await client(db, finance);
    await assert.rejects(index(db), /CREW_HISTORY_ACCESS_DENIED/);
    await assert.rejects(history(db), /CREW_HISTORY_ACCESS_DENIED/);
    assert.deepEqual(await snapshot(), before);
  } finally {
    await db.close();
  }
});

test("caller search path cannot replace the role guard or provenance tables", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await db.exec(
      "create schema synthetic_shadow;grant usage on schema synthetic_shadow to authenticated;create function synthetic_shadow.crew_role(uuid) returns text language sql immutable as $$select 'admin'::text$$;create table synthetic_shadow.crew_transfer_links(secret text);grant select on synthetic_shadow.crew_transfer_links to authenticated;insert into synthetic_shadow.crew_transfer_links values('SHADOW-SYNTHETIC-SECRET');set search_path=synthetic_shadow,public",
    );
    await client(db, finance);
    assert.equal(
      (await db.query<any>("select crew_role($1) role", [e1])).rows[0].role,
      "admin",
    );
    await assert.rejects(index(db), /CREW_HISTORY_ACCESS_DENIED/);
    await assert.rejects(history(db), /CREW_HISTORY_ACCESS_DENIED/);
    await client(db);
    const result = await history(db);
    assert.equal(result.sourceRow.id, "w1");
    assert.doesNotMatch(JSON.stringify(result), /SHADOW-SYNTHETIC-SECRET/);
    const config = (
      await db.query<any>(
        "select proconfig from pg_proc where oid='public.crew_transfer_history_row(uuid,uuid,uuid)'::regprocedure",
      )
    ).rows[0].proconfig;
    assert.ok(config.includes('search_path=""'));
  } finally {
    await db.close();
  }
});

test("1000 source packages are complete and 1001 fails explicitly instead of truncating", async () => {
  const db = await setup();
  try {
    await owner(db);
    const sources = Array.from({ length: 1000 }, (_, i) => {
      const source = text() + " ".repeat(i);
      return { id: uid(10000 + i), hash: sha(source), source };
    });
    await db.query(
      "insert into crew_transfer_packages(id,edition_id,source_sha256,source_text,actor_id) select x.id::uuid,$2::uuid,x.hash,x.source,$3::uuid from jsonb_to_recordset($1::jsonb) x(id text,hash text,source text)",
      [JSON.stringify(sources), e1, admin],
    );
    await db.query(
      "insert into crew_transfer_links(package_id,edition_id,source_row_id,roster_id,source_history_id,actor_id) select x.id::uuid,$2::uuid,'w1',$3::uuid,'h1',$4::uuid from jsonb_to_recordset($1::jsonb) x(id text)",
      [JSON.stringify(sources.map(({ id }) => ({ id }))), e1, r1, admin],
    );
    await client(db);
    const list = await index(db);
    assert.equal(list.sources.length, 1000);
    assert.equal(new Set(list.sources.map((s: any) => s.packageId)).size, 1000);
    assert.doesNotMatch(JSON.stringify(list), /PRIVATE-SYNTHETIC/);
    await owner(db);
    const last = uid(11000);
    await capture(db, text() + " ".repeat(1000), last);
    await link(db, "w1", r1, "h1", last);
    await client(db);
    await assert.rejects(
      () => index(db),
      (err: any) => {
        assert.equal(err.code, "54000");
        assert.match(err.message, /CREW_HISTORY_LIMIT_EXCEEDED/);
        return true;
      },
    );
    assert.equal((await history(db, e1, r1, last)).packageId, last);
    assert.deepEqual((await index(db, e1, r2)).sources, []);
  } finally {
    await db.close();
  }
});
