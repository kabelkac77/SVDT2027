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

async function sourceFixture() {
  const tools = fileURLToPath(new URL("../tools/", import.meta.url)),
    tests = fileURLToPath(new URL("./", import.meta.url));
  return execFileSync(
    "python3",
    [
      "-I",
      "-c",
      "import sys;sys.path[:0]=sys.argv[1:];from crew_import_preview_test import fixture,encode;sys.stdout.buffer.write(encode(fixture()))",
      tools,
      tests,
    ],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}
async function planFor(db: PGlite, source: string) {
  const target = (
    await db.query<any>("select crew_import_target_preview($1) data", [e1])
  ).rows[0].data;
  return JSON.stringify({
    version: 1,
    editionId: e1,
    sourceSha256: sha(source),
    targetFingerprint: target.targetFingerprint,
    categories: [
      {
        sourceCategoryId: "cat1",
        targetCategoryId: uid(501),
        action: "create",
        expectedVersion: 0,
      },
    ],
    entries: [
      {
        sourceRowId: "w1",
        targetRosterId: uid(601),
        action: "create",
        expectedVersion: 0,
        compensationAction: "create",
        expectedCompensationVersion: 0,
        kind: "unresolved",
        personId: null,
        linkedUserId: null,
      },
    ],
  });
}
async function approve(db: PGlite, plan: string, expires?: string) {
  return (
    await db.query<any>(
      "select crew_import_stage_approval($1,$2,$3" +
        (expires ? ",$4" : "") +
        ") id",
      expires
        ? [e1, plan, "b".repeat(64), expires]
        : [e1, plan, "b".repeat(64)],
    )
  ).rows[0].id;
}
async function apply(
  db: PGlite,
  approval: string,
  plan: string,
  source: string,
  request = randomUUID(),
) {
  return (
    await db.query<any>("select crew_import_apply($1,$2,$3,$4,$5) data", [
      e1,
      approval,
      request,
      plan,
      source,
    ])
  ).rows[0].data;
}
test("initial source validation, approval and atomic create import work on synthetic fixture only", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture();
    const normalized = (
      await db.query<any>("select crew_import_source($1) data", [source])
    ).rows[0].data;
    assert.equal(normalized.entries.length, 1);
    const plan = await planFor(db, source),
      approval = await approve(db, plan);
    await client(db);
    const result = await apply(db, approval, plan, source);
    assert.equal(result.createdCategories, 1);
    assert.equal(result.createdEntries, 1);
    assert.equal(result.createdCompensations, 1);
    assert.equal(
      (
        await db.query<any>(
          "select agreed,estimate,paid from crew_compensation where roster_id=$1",
          [uid(601)],
        )
      ).rows[0].agreed,
      0,
    );
    await owner(db);
    assert.equal(await count(db, "crew_transfer_packages"), 1);
    assert.equal(await count(db, "crew_transfer_links"), 1);
    assert.equal(await count(db, "crew_import_source_rows"), 1);
    assert.equal(
      (await db.query<any>("select source_text from crew_transfer_packages"))
        .rows[0].source_text,
      source,
    );
  } finally {
    await db.close();
  }
});

async function reject(promise: Promise<any>, code: string) {
  await assert.rejects(promise, (e: any) => {
    assert.equal(e.message, code);
    return true;
  });
}
async function snapshotCounts(db: PGlite) {
  await owner(db);
  const result: any = {};
  for (const t of [
    "crew_categories",
    "crew_roster",
    "crew_compensation",
    "crew_transfer_packages",
    "crew_transfer_links",
    "crew_import_source_rows",
    "crew_import_requests",
    "crew_audit",
    "people",
    "edition_members",
    "crew_members",
    "auth.users",
  ])
    result[t] = await count(db, t);
  return result;
}
test("same request replays once; changed bytes and reused approval cannot create duplicates", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan),
      id = randomUUID();
    await client(db);
    const first = await apply(db, approval, plan, source, id);
    const before = await snapshotCounts(db);
    await client(db);
    assert.deepEqual(await apply(db, approval, plan, source, id), first);
    await reject(
      apply(db, approval, plan + " ", source, id),
      "CREW_IMPORT_REQUEST_REUSED",
    );
    await reject(
      apply(db, approval, plan, source),
      "CREW_IMPORT_APPROVAL_USED",
    );
    assert.deepEqual(await snapshotCounts(db), before);
  } finally {
    await db.close();
  }
});
test("approval is actor-bound and cannot be staged or revoked by authenticated clients", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan);
    await db.query("insert into edition_members values($1,$2,$3,$4)", [
      e1,
      otherAdmin,
      "Other",
      "admin",
    ]);
    await client(db, otherAdmin);
    await reject(
      apply(db, approval, plan, source),
      "CREW_IMPORT_APPROVAL_REQUIRED",
    );
    await client(db);
    await assert.rejects(approve(db, plan), /permission denied/);
    await assert.rejects(
      db.query("select crew_import_revoke($1,$2)", [e1, approval]),
      /permission denied/,
    );
    for (const t of ["crew_import_requests", "crew_import_source_rows"])
      await assert.rejects(db.query("select * from " + t), /permission denied/);
    await assert.rejects(
      db.exec("insert into crew_import_source_rows default values"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select crew_import_source($1)", [source]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("revocation, lost admin role and archived edition block successful-request replay", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan),
      id = randomUUID();
    await client(db);
    await apply(db, approval, plan, source, id);
    await owner(db);
    await db.query("update editions set archived=true where id=$1", [e1]);
    await client(db);
    await reject(
      apply(db, approval, plan, source, id),
      "CREW_IMPORT_EDITION_LOCKED",
    );
    await owner(db);
    await db.query("update editions set archived=false where id=$1", [e1]);
    await db.query(
      "update edition_members set role=$1 where edition_id=$2 and user_id=$3",
      ["viewer", e1, admin],
    );
    await client(db);
    await reject(
      apply(db, approval, plan, source, id),
      "CREW_IMPORT_ACCESS_DENIED",
    );
    await owner(db);
    await db.query(
      "update edition_members set role=$1 where edition_id=$2 and user_id=$3",
      ["admin", e1, admin],
    );
    await db.query("select crew_import_revoke($1,$2)", [e1, approval]);
    await client(db);
    await reject(
      apply(db, approval, plan, source, id),
      "CREW_IMPORT_APPROVAL_REVOKED",
    );
  } finally {
    await db.close();
  }
});
test("target fingerprint ignores read timestamp and detects drift before writing", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan);
    assert.equal(
      JSON.parse(await planFor(db, source)).targetFingerprint,
      JSON.parse(plan).targetFingerprint,
    );
    await db.query("update crew_roster set name=$1 where id=$2", [
      "Changed synthetic",
      r1,
    ]);
    const before = await snapshotCounts(db);
    await client(db);
    await reject(
      apply(db, approval, plan, source),
      "CREW_IMPORT_TARGET_CHANGED",
    );
    assert.deepEqual(await snapshotCounts(db), before);
  } finally {
    await db.close();
  }
});
test("source or plan byte changes cannot bypass the approved hashes", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan),
      before = await snapshotCounts(db);
    await client(db);
    await reject(
      apply(db, approval, plan, source + " "),
      "CREW_IMPORT_APPROVAL_MISMATCH",
    );
    await reject(
      apply(db, approval, plan + " ", source),
      "CREW_IMPORT_APPROVAL_MISMATCH",
    );
    assert.deepEqual(await snapshotCounts(db), before);
  } finally {
    await db.close();
  }
});
test("complete coverage and UUID/version checks roll back packages as well as crew", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture();
    for (const mutate of [
      (p: any) => (p.entries = []),
      (p: any) => (p.entries[0].targetRosterId = r1),
      (p: any) => (p.categories[0].targetCategoryId = c2),
    ]) {
      let p = JSON.parse(await planFor(db, source));
      mutate(p);
      const plan = JSON.stringify(p),
        approval = await approve(db, plan),
        before = await snapshotCounts(db);
      await client(db);
      await reject(
        apply(db, approval, plan, source),
        p.entries.length === 0
          ? "CREW_IMPORT_SOURCE_COVERAGE"
          : "CREW_IMPORT_VERSION_CONFLICT",
      );
      assert.deepEqual(await snapshotCounts(db), before);
    }
  } finally {
    await db.close();
  }
});
test("late second-row trigger failure rolls back every row, financial row, provenance and audit", async () => {
  const db = await setup();
  try {
    await owner(db);
    const data = JSON.parse(await sourceFixture());
    const work = data.find((t: any) => t.name === "working");
    const second = structuredClone(work.rows[0]);
    second[0] = "w2";
    work.rows.push(second);
    const source = JSON.stringify(data),
      p = JSON.parse(await planFor(db, source));
    p.entries.push({
      ...p.entries[0],
      sourceRowId: "w2",
      targetRosterId: uid(602),
    });
    const plan = JSON.stringify(p),
      approval = await approve(db, plan);
    await db.exec(
      `create function fail_second() returns trigger language plpgsql as $$begin if new.id='${uid(602)}' then raise exception 'PRIVATE SYNTHETIC FAILURE';end if;return new;end;$$;create trigger fail_second before insert on crew_roster for each row execute function fail_second()`,
    );
    const before = await snapshotCounts(db);
    await client(db);
    await reject(apply(db, approval, plan, source), "CREW_IMPORT_FAILED");
    assert.deepEqual(await snapshotCounts(db), before);
    await db.exec("drop trigger fail_second on crew_roster");
    await client(db);
    const result = await apply(db, approval, plan, source);
    assert.equal(result.createdEntries, 2);
    assert.equal(result.sourceRows, 2);
    await owner(db);
    assert.equal(await count(db, "crew_transfer_links"), 2);
    assert.equal(await count(db, "crew_import_source_rows"), 2);
    assert.equal(await count(db, "people"), before.people);
    assert.equal(await count(db, "auth.users"), before["auth.users"]);
  } finally {
    await db.close();
  }
});
test("immutable approval records and unsuitable transaction isolation fail closed", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source),
      approval = await approve(db, plan);
    await reject(
      db.query(
        "update crew_import_approvals set expires_at=expires_at where id=$1",
        [approval],
      ),
      "CREW_IMPORT_IMMUTABLE",
    );
    await reject(
      db.exec("truncate crew_import_approvals cascade"),
      "CREW_IMPORT_IMMUTABLE",
    );
    await assert.rejects(
      approve(db, plan, "2099-01-01T00:00:00Z"),
      /CREW_IMPORT_APPROVAL_INVALID/,
    );
    await client(db);
    await db.exec("begin isolation level repeatable read");
    await reject(
      apply(db, approval, plan, source),
      "CREW_IMPORT_ISOLATION_REQUIRED",
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
test("duplicate plan keys, identity creation and malformed source data are rejected", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source);
    for (const p of [
      plan.replace("{", '{"version":1,'),
      JSON.stringify({ ...JSON.parse(plan), extra: true }),
      JSON.stringify({
        ...JSON.parse(plan),
        entries: [
          {
            ...JSON.parse(plan).entries[0],
            kind: "person",
            personId: uid(900),
          },
        ],
      }),
    ])
      await reject(
        db.query("select crew_import_plan($1,$2)", [e1, p]),
        "CREW_IMPORT_INVALID_PLAN",
      );
    for (const mutate of [
      (d: any) =>
        d
          .find((t: any) => t.name === "working")
          .rows.push(d.find((t: any) => t.name === "working").rows[0]),
      (d: any) => (d.find((t: any) => t.name === "working").rows[0][1] = 2027),
      (d: any) => {
        const w = d.find((t: any) => t.name === "working").rows[0];
        w[3] = w[3].replace('"agreed": 0', '"agreed": -1');
      },
    ]) {
      const d = JSON.parse(source);
      mutate(d);
      await reject(
        db.query("select crew_import_source($1)", [JSON.stringify(d)]),
        "CREW_IMPORT_INVALID_SOURCE",
      );
    }
  } finally {
    await db.close();
  }
});
test("legacy source capture remains validated without private importer cache", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await assert.rejects(
      link(db, "missing", r2, null),
      /CREW_TRANSFER_INVALID_LINK/,
    );
    assert.equal(await count(db, "crew_import_source_rows"), 0);
  } finally {
    await db.close();
  }
});
test("Python plan builder uses the exact server fingerprint and imports only synthetic data", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      target = (
        await db.query<any>("select crew_import_target_preview($1) data", [e1])
      ).rows[0].data;
    const mapping = {
      editionId: e1,
      categories: { cat1: { id: uid(501), action: "create" } },
      entries: {
        w1: {
          id: uid(601),
          action: "create",
          compensationAction: "create",
          kind: "group",
        },
      },
    };
    const tools = fileURLToPath(new URL("../tools/", import.meta.url));
    const out = JSON.parse(
      execFileSync(
        "python3",
        [
          "-I",
          "-c",
          "import sys,json;sys.path.insert(0,sys.argv[1]);from crew_import_plan import build_import_plan;d=json.load(sys.stdin);print(json.dumps(build_import_plan(d['source'].encode(),d['mapping'],d['target'])))",
          tools,
        ],
        {
          input: JSON.stringify({ source, mapping, target }),
          encoding: "utf8",
        },
      ),
    );
    assert.equal(out.applyReady, false);
    assert.equal(out.blockers.length, 3);
    assert.equal(out.targetFingerprint, target.targetFingerprint);
    const approval = await approve(db, out.planText);
    await client(db);
    assert.equal(
      (await apply(db, approval, out.planText, source)).createdEntries,
      1,
    );
    await owner(db);
    const counts = await snapshotCounts(db);
    const t = (
      await db.query<any>("select crew_import_target_preview($1) data", [e1])
    ).rows[0].data;
    assert.equal(t.sourceLinks.length, 1);
    assert.equal(counts.people, 0);
    assert.equal(counts["auth.users"], 7);
  } finally {
    await db.close();
  }
});

test("expired approvals reject new writes while an expired successful request can replay", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture(),
      plan = await planFor(db, source);
    const expired = (
      await db.query<any>(
        "select crew_import_stage_approval($1,$2,$3,clock_timestamp()+interval '100 milliseconds') id",
        [e1, plan, "b".repeat(64)],
      )
    ).rows[0].id;
    await db.exec("select pg_sleep(0.11)");
    await client(db);
    await reject(
      apply(db, expired, plan, source),
      "CREW_IMPORT_APPROVAL_EXPIRED",
    );
    await owner(db);
    const a = (
      await db.query<any>(
        "select crew_import_stage_approval($1,$2,$3,clock_timestamp()+interval '1 second') id",
        [e1, plan, "b".repeat(64)],
      )
    ).rows[0].id;
    const id = randomUUID();
    await client(db);
    const result = await apply(db, a, plan, source, id);
    await db.exec("select pg_sleep(1.01)");
    assert.deepEqual(await apply(db, a, plan, source, id), result);
  } finally {
    await db.close();
  }
});
test("mixed create and exact keep preserves identity, versions, goals and financial NULL versus zero", async () => {
  const db = await setup();
  try {
    await owner(db);
    const data = JSON.parse(await sourceFixture()),
      work = data.find((t: any) => t.name === "working");
    const second = structuredClone(work.rows[0]);
    second[0] = "w2";
    work.rows.push(second);
    const source = JSON.stringify(data);
    const norm = (
        await db.query<any>("select crew_import_source($1) data", [source])
      ).rows[0].data,
      roster = norm.entries[0].roster,
      comp = norm.entries[0].compensation;
    await db.query("insert into people(id,name) values($1,$2)", [
      uid(900),
      "Synthetic existing person",
    ]);
    await db.query(
      "insert into crew_categories(id,edition_id,name,color,required_count,required_term,version) values($1,$2,$3,$4,123,$5,4)",
      [
        uid(501),
        e1,
        norm.categories[0].name,
        norm.categories[0].color,
        "Preserved goal",
      ],
    );
    const values: any = {
      id: uid(601),
      edition_id: e1,
      category_id: uid(501),
      ...roster,
      kind: "person",
      person_id: uid(900),
      linked_user_id: member,
      version: 7,
    };
    const keys = Object.keys(values);
    await db.query(
      "insert into crew_roster(" +
        keys.join(",") +
        ") values(" +
        keys.map((_, i) => "$" + (i + 1)).join(",") +
        ")",
      Object.values(values),
    );
    const c: any = { roster_id: uid(601), edition_id: e1, ...comp, version: 3 },
      ck = Object.keys(c);
    await db.query(
      "insert into crew_compensation(" +
        ck.join(",") +
        ") values(" +
        ck.map((_, i) => "$" + (i + 1)).join(",") +
        ")",
      Object.values(c),
    );
    let p = JSON.parse(await planFor(db, source));
    p.categories[0].action = "keep";
    p.categories[0].expectedVersion = 4;
    p.entries[0] = {
      ...p.entries[0],
      action: "keep",
      expectedVersion: 7,
      compensationAction: "keep",
      expectedCompensationVersion: 3,
      kind: "person",
      personId: uid(900),
      linkedUserId: member,
    };
    p.entries.push({
      ...p.entries[0],
      sourceRowId: "w2",
      targetRosterId: uid(602),
      action: "create",
      expectedVersion: 0,
      compensationAction: "create",
      expectedCompensationVersion: 0,
      kind: "group",
      personId: null,
      linkedUserId: null,
    });
    const plan = JSON.stringify(p),
      a = await approve(db, plan);
    await client(db);
    const r = await apply(db, a, plan, source);
    assert.equal(r.keptCategories, 1);
    assert.equal(r.keptEntries, 1);
    assert.equal(r.createdEntries, 1);
    assert.equal(r.keptCompensations, 1);
    const cat = (
      await db.query<any>("select * from crew_categories where id=$1", [
        uid(501),
      ])
    ).rows[0];
    assert.equal(cat.required_count, 123);
    assert.equal(cat.required_term, "Preserved goal");
    assert.equal(cat.version, 4);
    const old = (
      await db.query<any>("select * from crew_roster where id=$1", [uid(601)])
    ).rows[0];
    assert.equal(old.version, 7);
    assert.equal(old.person_id, uid(900));
    assert.equal(old.linked_user_id, member);
    assert.deepEqual(
      (
        await db.query<any>(
          "select estimate,agreed,paid,version from crew_compensation where roster_id=$1",
          [uid(601)],
        )
      ).rows[0],
      { estimate: null, agreed: 0, paid: null, version: 3 },
    );
  } finally {
    await db.close();
  }
});
test("keep rejects mismatched values or versions and already imported source needs separate review", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = await sourceFixture();
    let p = JSON.parse(await planFor(db, source));
    p.categories[0] = {
      ...p.categories[0],
      targetCategoryId: c1,
      action: "keep",
      expectedVersion: 1,
    };
    let plan = JSON.stringify(p),
      a = await approve(db, plan),
      before = await snapshotCounts(db);
    await client(db);
    await reject(apply(db, a, plan, source), "CREW_IMPORT_TARGET_DIFFERENT");
    assert.deepEqual(await snapshotCounts(db), before);
    await owner(db);
    p.categories[0].expectedVersion = 2;
    plan = JSON.stringify(p);
    a = await approve(db, plan);
    await client(db);
    await reject(apply(db, a, plan, source), "CREW_IMPORT_VERSION_CONFLICT");
    await owner(db);
    await capture(db, source);
    plan = await planFor(db, source);
    a = await approve(db, plan);
    await client(db);
    await reject(
      apply(db, a, plan, source),
      "CREW_IMPORT_SOURCE_ALREADY_PRESENT",
    );
  } finally {
    await db.close();
  }
});
test("460 synthetic rows and nine categories retain complete provenance without per-link source reparsing", async () => {
  const db = await setup();
  try {
    await owner(db);
    const data = JSON.parse(await sourceFixture());
    const cats = data.find((t: any) => t.name === "categories");
    const cat = structuredClone(cats.rows[0]);
    cats.rows = [];
    for (let n = 1; n <= 9; n++) {
      const c = structuredClone(cat);
      c[0] = "cat" + n;
      c[1] = "Synthetic category " + n;
      c[2] = "synthetic-category-" + n;
      c[3] = "cat-" + (n - 1);
      c[4] = n - 1;
      cats.rows.push(c);
    }
    const work = data.find((t: any) => t.name === "working"),
      row = structuredClone(work.rows[0]);
    work.rows = [];
    for (let n = 1; n <= 460; n++) {
      const r = structuredClone(row);
      r[0] = "w" + n;
      r[2] = "cat" + (((n - 1) % 9) + 1);
      const content = JSON.parse(r[3]);
      content.categoryId = r[2];
      r[3] = JSON.stringify(content);
      work.rows.push(r);
    }
    const source = JSON.stringify(data),
      p = JSON.parse(await planFor(db, source));
    p.categories = [];
    p.entries = [];
    for (let n = 1; n <= 9; n++)
      p.categories.push({
        sourceCategoryId: "cat" + n,
        targetCategoryId: uid(1000 + n),
        action: "create",
        expectedVersion: 0,
      });
    for (let n = 1; n <= 460; n++)
      p.entries.push({
        sourceRowId: "w" + n,
        targetRosterId: uid(2000 + n),
        action: "create",
        expectedVersion: 0,
        compensationAction: "create",
        expectedCompensationVersion: 0,
        kind: "unresolved",
        personId: null,
        linkedUserId: null,
      });
    const plan = JSON.stringify(p),
      a = await approve(db, plan);
    await client(db);
    const r = await apply(db, a, plan, source);
    assert.equal(r.createdEntries, 460);
    assert.equal(r.createdCategories, 9);
    assert.equal(r.createdCompensations, 460);
    await owner(db);
    assert.equal(await count(db, "crew_transfer_links"), 460);
    assert.equal(await count(db, "crew_import_source_rows"), 460);
    assert.equal(
      (await db.query<any>("select source_text from crew_transfer_packages"))
        .rows[0].source_text,
      source,
    );
  } finally {
    await db.close();
  }
});
