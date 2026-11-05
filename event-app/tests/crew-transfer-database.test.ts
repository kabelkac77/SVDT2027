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
test("private package preserves exact original UTF8 text and hash with verified actor and minimal audit", async () => {
  const db = await setup();
  try {
    await owner(db);
    const source = text(),
      p = await capture(db, source);
    assert.equal(p.source_text, source);
    assert.equal(p.source_sha256, sha(source));
    assert.equal(p.actor_id, admin);
    assert.notEqual(String(p.created_at).slice(0, 4), "1980");
    await link(db);
    const audit = (
      await db.query<any>(
        "select kind,actor_id,new_data from crew_audit where kind like 'transfer_%' order by kind",
      )
    ).rows;
    assert.equal(audit.length, 2);
    assert.ok(audit.every((a) => a.actor_id === admin));
    assert.ok(!JSON.stringify(audit).includes("PRIVATE-SYNTHETIC"));
    assert.equal(JSON.parse(p.source_text).length, 7);
  } finally {
    await db.close();
  }
});
test("only administrator of the exact edition can read original sources and links", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await client(db);
    assert.equal(await count(db, "crew_transfer_packages"), 1);
    for (const id of [coord, finance, member, otherAdmin, outsider, partner]) {
      await client(db, id);
      assert.equal(await count(db, "crew_transfer_packages"), 0);
      assert.equal(await count(db, "crew_transfer_links"), 0);
    }
    await db.exec("reset role;set role anon");
    await assert.rejects(
      () => count(db, "crew_transfer_packages"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("no client, even crew administrator, has direct source mutations or internal parser execution", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    await client(db);
    for (const sql of [
      "update crew_transfer_packages set source_format='crew-tables-v1'",
      "delete from crew_transfer_links",
      "truncate crew_transfer_links",
      "insert into crew_transfer_packages(edition_id,source_sha256,source_text,actor_id) values('" +
        e1 +
        "','" +
        sha("[]") +
        "','[]','" +
        admin +
        "')",
    ])
      await assert.rejects(() => db.exec(sql), /permission denied/);
    await assert.rejects(
      () =>
        db.query("select crew_transfer_source_row($1,'working','w1')", [
          text(),
        ]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("capture guards also reject a privileged caller without the actual crew administrator identity", async () => {
  const db = await setup();
  try {
    for (const id of [coord, finance, member, outsider, otherAdmin, ""]) {
      await owner(db, id);
      await assert.rejects(() => capture(db), /CREW_TRANSFER_ACCESS_DENIED/);
    }
    await owner(db);
    assert.equal(await count(db, "crew_transfer_packages"), 0);
    assert.equal(await count(db, "crew_audit"), 0);
  } finally {
    await db.close();
  }
});
test("duplicate snapshots and source links cannot duplicate audit or merge two working rows", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await assert.rejects(
      () => capture(db, text(), randomUUID()),
      /unique|duplicate/,
    );
    await link(db);
    await assert.rejects(() => link(db, "w1", r2, "h1"), /unique|duplicate/);
    await assert.rejects(() => link(db, "w2", r1, null), /unique|duplicate/);
    assert.equal(await count(db, "crew_transfer_packages"), 1);
    assert.equal(await count(db, "crew_transfer_links"), 1);
    assert.equal(await count(db, "crew_audit"), 2);
  } finally {
    await db.close();
  }
});
test("edition and roster references prevent foreign or nonexistent target associations", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await assert.rejects(() => link(db, "w1", r3), /foreign key/);
    await assert.rejects(() => link(db, "w1", uid(999)), /foreign key/);
    await owner(db, otherAdmin);
    await assert.rejects(
      () => link(db, "w1", r3, "h1", pkg, e2),
      /CREW_TRANSFER_INVALID_LINK/,
    );
    await owner(db);
    assert.equal(await count(db, "crew_transfer_links"), 0);
    assert.equal(await count(db, "crew_audit"), 1);
  } finally {
    await db.close();
  }
});
test("working and historical source identities must exist once and match the original source link", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    for (const [row, history] of [
      ["missing", "h1"],
      ["w1", null],
      ["w1", "h2"],
      ["w2", "h1"],
    ] as const)
      await assert.rejects(
        () => link(db, row, r1, history),
        /CREW_TRANSFER_INVALID_LINK/,
      );
    await link(db, "w2", r2, null);
    assert.equal(await count(db, "crew_transfer_links"), 1);
  } finally {
    await db.close();
  }
});
test("textual source years are mandatory and duplicate local IDs or malformed source columns fail closed", async () => {
  const db = await setup();
  try {
    await owner(db);
    for (const mode of [
      "numeric-year",
      "history-year",
      "duplicate-id",
      "duplicate-column",
    ]) {
      const data = payload();
      const w = data.find((t) => t.name === "working")!;
      if (mode === "numeric-year") (w.rows[0] as any[])[1] = 2027;
      if (mode === "history-year")
        data.find((t) => t.name === "history")!.rows[0][1] = "2025";
      if (mode === "duplicate-id") w.rows.push([...w.rows[0]]);
      if (mode === "duplicate-column") w.columns[1] = "id";
      const id = randomUUID();
      await capture(db, JSON.stringify(data), id);
      await assert.rejects(
        () => link(db, "w1", r1, "h1", id),
        /CREW_TRANSFER_INVALID_LINK/,
      );
    }
    assert.equal(await count(db, "crew_transfer_links"), 0);
  } finally {
    await db.close();
  }
});
test("incorrect source hash and malformed JSON expose only the constant error and do not leave audit", async () => {
  const db = await setup();
  try {
    await owner(db);
    for (const [source, hash] of [
      [text(), "0".repeat(64)],
      ["PRIVATE-BROKEN-{", sha("PRIVATE-BROKEN-{")],
      ["{}", sha("{}")],
    ])
      await assert.rejects(
        () => capture(db, source, randomUUID(), hash),
        (e) => (e as Error).message === "CREW_TRANSFER_INVALID_SOURCE",
      );
    assert.equal(await count(db, "crew_transfer_packages"), 0);
    assert.equal(await count(db, "crew_audit"), 0);
  } finally {
    await db.close();
  }
});
test("existing source packages and links are immutable even for their table owner", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await link(db);
    for (const sql of [
      "update crew_transfer_packages set source_text=source_text",
      "delete from crew_transfer_links",
      "delete from crew_transfer_packages",
      "update crew_transfer_links set source_row_id='w2'",
      "truncate crew_transfer_links",
      "truncate crew_transfer_links,crew_transfer_packages",
    ])
      await assert.rejects(() => db.exec(sql), /CREW_TRANSFER_IMMUTABLE/);
    assert.equal(await count(db, "crew_transfer_packages"), 1);
    assert.equal(await count(db, "crew_transfer_links"), 1);
  } finally {
    await db.close();
  }
});
test("archive allows administrator history reads but blocks new packages and links", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await db.query("update editions set archived=true where id=$1", [e1]);
    await assert.rejects(
      () => capture(db, "[]", randomUUID()),
      /CREW_TRANSFER_EDITION_ARCHIVED/,
    );
    await assert.rejects(() => link(db), /CREW_TRANSFER_EDITION_ARCHIVED/);
    await client(db);
    assert.equal(await count(db, "crew_transfer_packages"), 1);
  } finally {
    await db.close();
  }
});
test("revoking the inherited administrator removes source access immediately", async () => {
  const db = await setup();
  try {
    await owner(db);
    await capture(db);
    await db.query(
      "delete from edition_members where edition_id=$1 and user_id=$2",
      [e1, admin],
    );
    await client(db);
    assert.equal(await count(db, "crew_transfer_packages"), 0);
    await owner(db);
    await assert.rejects(
      () => capture(db, "[]", randomUUID()),
      /CREW_TRANSFER_ACCESS_DENIED/,
    );
  } finally {
    await db.close();
  }
});
