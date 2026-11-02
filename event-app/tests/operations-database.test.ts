import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const actor = {
  admin: "00000000-0000-0000-0000-000000000001",
  coord: "00000000-0000-0000-0000-000000000002",
  member: "00000000-0000-0000-0000-000000000003",
  outsider: "00000000-0000-0000-0000-000000000004",
  partner: "00000000-0000-0000-0000-000000000005",
  finance: "00000000-0000-0000-0000-000000000006",
};
const e1 = "20000000-0000-0000-0000-000000000001",
  e2 = "20000000-0000-0000-0000-000000000002",
  e3 = "20000000-0000-0000-0000-000000000003";
async function setup() {
  const db = new PGlite();
  await db.exec(
    `create schema auth;create table auth.users(id uuid primary key,email text);create role anon nologin;create role authenticated nologin;grant usage on schema public,auth to authenticated;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  for (const filename of [
    "202609280001_partners.sql",
    "202609290001_partner_history.sql",
    "202611020001_crew.sql",
    "202611020002_operations.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + filename, import.meta.url),
        "utf8",
      ),
    );
  for (const [name, id] of Object.entries(actor))
    await db.query("insert into auth.users values($1,$2)", [
      id,
      name + "@example.invalid",
    ]);
  await db.exec(
    `insert into events(id,name) values('10000000-0000-0000-0000-000000000001','Synthetic event');insert into editions(id,event_id,year,name) values('${e1}','10000000-0000-0000-0000-000000000001',2027,'Synthetic 2027'),('${e2}','10000000-0000-0000-0000-000000000001',2028,'Synthetic 2028'),('${e3}','10000000-0000-0000-0000-000000000001',2029,'Synthetic no inherited admin');insert into edition_members values('${e1}','${actor.admin}','Admin','admin'),('${e2}','${actor.admin}','Admin','admin'),('${e1}','${actor.partner}','Partner viewer','viewer');insert into crew_members values('${e1}','${actor.coord}','coordinator',true,false,1),('${e1}','${actor.member}','member',true,false,1),('${e1}','${actor.finance}','coordinator',true,true,1),('${e3}','${actor.admin}','admin',true,false,1);`,
  );
  return db;
}
async function as(db: PGlite, id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function write(
  db: PGlite,
  kind: string,
  p: object,
  edition = e1,
  req = randomUUID(),
) {
  return (
    await db.query<any>("select crew_write($1,$2,$3::jsonb,$4) result", [
      edition,
      kind,
      JSON.stringify(p),
      req,
    ])
  ).rows[0].result;
}
const category = (extra = {}) => ({
  version: 0,
  name: "Synthetic registration",
  color: "cat-0",
  required_count: null,
  required_term: "",
  ...extra,
});
const roster = (cat: string, extra = {}) => ({
  version: 0,
  category_id: cat,
  kind: "person",
  name: "Fiktivní crew",
  position: "Registrace",
  owner_label: "QA",
  email: "qa@example.invalid",
  phone: "00123",
  status: "confirmed",
  term: "Synthetic slot",
  friday: "08:00–16:00",
  saturday: "07:00–18:00",
  notes: "",
  archived: false,
  ...extra,
});
async function seed(db: PGlite) {
  await as(db, actor.admin);
  const cat = await write(db, "category", category());
  const row = await write(
    db,
    "roster",
    roster(cat.id, { linked_user_id: actor.member }),
  );
  return { cat, row };
}
async function count(db: PGlite, table: string) {
  return (await db.query<any>("select count(*)::int n from " + table)).rows[0]
    .n;
}

async function op(
  db: PGlite,
  kind: string,
  p: object,
  edition = e1,
  req = randomUUID(),
) {
  return (
    await db.query<any>("select operations_write($1,$2,$3::jsonb,$4) result", [
      edition,
      kind,
      JSON.stringify(p),
      req,
    ])
  ).rows[0].result;
}
const zone = (extra = {}) => ({
  version: 0,
  name: "Synthetic zone",
  instructions: "Synthetic instructions",
  color: "cat-1",
  map_x: 20,
  map_y: 30,
  contact_name: "Work contact",
  contact_phone: "00123",
  ...extra,
});
const task = (extra = {}) => ({
  version: 0,
  title: "Synthetic task",
  status: "todo",
  starts_at: "2027-06-05T08:00",
  ends_at: "2027-06-05T09:00",
  ...extra,
});
const registration = (extra = {}) => ({
  version: 0,
  full_name: "Synthetic rider",
  status: "new",
  fee_due: null,
  fee_paid: 0,
  ...extra,
});
test("operations member reads own tasks and zones, never registration contacts or grants of others", async () => {
  const db = await setup();
  try {
    const { row } = await seed(db),
      z = await op(db, "zone", zone());
    await op(db, "task", task({ zone_id: z.id, assignee_roster_id: row.id }));
    await op(db, "task", task({ title: "Other task" }));
    await op(db, "registration", registration());
    await as(db, actor.member);
    assert.equal(await count(db, "operations_tasks"), 1);
    assert.equal(await count(db, "operations_zones"), 1);
    assert.equal(await count(db, "operations_registrations"), 0);
    assert.equal(await count(db, "operations_grants"), 0);
    await assert.rejects(() => op(db, "task", task()), /CREW_ACCESS_DENIED/);
    await assert.rejects(
      () => op(db, "registration", registration()),
      /OPERATIONS_ACCESS_DENIED/,
    );
  } finally {
    await db.close();
  }
});
test("registration access is explicitly granted without granting crew or compensation edits", async () => {
  const db = await setup();
  try {
    await seed(db);
    await op(db, "registration_grant", {
      user_id: actor.member,
      version: 0,
      can_registration: true,
    });
    await as(db, actor.member);
    const r = await op(
      db,
      "registration",
      registration({ fee_due: 123400, fee_paid: 10000 }),
    );
    assert.equal(r.fee_due, 123400);
    assert.equal(r.fee_paid, 10000);
    assert.equal(await count(db, "operations_registrations"), 1);
    await assert.rejects(() => op(db, "zone", zone()), /CREW_ACCESS_DENIED/);
    await assert.rejects(
      () =>
        op(db, "registration_grant", {
          user_id: actor.member,
          version: 1,
          can_registration: true,
        }),
      /CREW_ACCESS_DENIED/,
    );
    assert.equal(await count(db, "crew_compensation"), 0);
  } finally {
    await db.close();
  }
});
test("coordinator sees operational tasks but not riders unless explicitly granted", async () => {
  const db = await setup();
  try {
    await seed(db);
    await op(db, "registration", registration());
    await as(db, actor.coord);
    await op(db, "zone", zone());
    await op(db, "task", task());
    assert.equal(await count(db, "operations_registrations"), 0);
    await assert.rejects(
      () => op(db, "registration", registration()),
      /OPERATIONS_ACCESS_DENIED/,
    );
    await assert.rejects(
      () =>
        db.exec(
          "insert into operations_tasks(edition_id,title) values('" +
            e1 +
            "','Forbidden')",
        ),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("operations isolate years, archive writes, anonymous users and partner-only viewers", async () => {
  const db = await setup();
  try {
    const { row } = await seed(db);
    await assert.rejects(
      () => op(db, "task", task({ assignee_roster_id: row.id }), e2),
      /OPERATIONS_INVALID_INPUT/,
    );
    await assert.rejects(
      () => op(db, "zone", zone({ leader_roster_id: row.id }), e2),
      /OPERATIONS_INVALID_INPUT/,
    );
    const z = await op(db, "zone", zone());
    await assert.rejects(
      () => op(db, "zone", zone({ id: z.id, version: 1 }), e2),
      /OPERATIONS_ACCESS_DENIED/,
    );
    await db.exec(
      "reset role;update editions set archived=true where id='" + e1 + "'",
    );
    await as(db, actor.admin);
    await assert.rejects(() => op(db, "task", task()), /CREW_EDITION_ARCHIVED/);
    await assert.rejects(
      () => op(db, "registration", registration()),
      /OPERATIONS_EDITION_ARCHIVED/,
    );
    for (const user of [actor.partner, actor.outsider]) {
      await as(db, user);
      for (const table of [
        "operations_tasks",
        "operations_zones",
        "operations_registrations",
      ])
        assert.equal(await count(db, table), 0);
    }
    await db.exec("reset role;set role anon");
    await assert.rejects(() => op(db, "zone", zone()), /permission denied/);
  } finally {
    await db.close();
  }
});
test("operations retries, stale versions, private audits and revocation remain checked", async () => {
  const db = await setup();
  try {
    await seed(db);
    await op(db, "registration_grant", {
      user_id: actor.member,
      version: 0,
      can_registration: true,
    });
    await as(db, actor.member);
    const req = randomUUID(),
      p = registration();
    const a = await op(db, "registration", p, e1, req);
    assert.deepEqual(await op(db, "registration", p, e1, req), a);
    await assert.rejects(
      () => op(db, "registration", { ...p, full_name: "Different" }, e1, req),
      /OPERATIONS_REQUEST_REUSED/,
    );
    await assert.rejects(
      () => op(db, "registration", { ...p, id: a.id, version: 0 }),
      /OPERATIONS_VERSION_CONFLICT/,
    );
    await as(db, actor.admin);
    const audit = (
      await db.query<any>(
        "select actor_id from crew_audit where kind='operations:registration'",
      )
    ).rows;
    assert.equal(audit[0].actor_id, actor.member);
    assert.equal(await count(db, "audit_log"), 0);
    await op(db, "registration_grant", {
      user_id: actor.member,
      version: 1,
      can_registration: false,
    });
    await as(db, actor.member);
    assert.equal(await count(db, "operations_registrations"), 0);
    await assert.rejects(
      () => op(db, "registration", p, e1, req),
      /OPERATIONS_ACCESS_DENIED/,
    );
  } finally {
    await db.close();
  }
});
test("operations validate local Prague date ranges, map coordinates and nullable money", async () => {
  const db = await setup();
  try {
    await seed(db);
    for (const starts_at of [
      "infinity",
      "2027-01-01T24:00",
      "2027-01-01T10:00Z",
      "2027-02-30T10:00",
      "2027-01-01T10:00+01:00",
    ])
      await assert.rejects(
        () => op(db, "task", task({ starts_at })),
        /OPERATIONS_INVALID_INPUT/,
      );
    await assert.rejects(
      () => op(db, "task", task({ ends_at: "2027-06-05T07:00" })),
      /OPERATIONS_INVALID_INPUT/,
    );
    const t = await op(db, "task", task());
    assert.match(String(t.starts_at), /08:00/);
    for (const extra of [
      { map_x: 101 },
      { map_y: null },
      { map_x: "20" },
      { map_x: 100.0004 },
      { map_y: -0.0004 },
    ])
      await assert.rejects(
        () => op(db, "zone", zone(extra)),
        /OPERATIONS_INVALID_INPUT/,
      );
    const r = await op(db, "registration", registration());
    assert.equal(r.fee_due, null);
    assert.equal(r.fee_paid, 0);
    for (const fee_due of [-1, 1.2, "100"])
      await assert.rejects(
        () => op(db, "registration", registration({ fee_due })),
        /OPERATIONS_INVALID_INPUT/,
      );
    await assert.rejects(
      () => op(db, "registration", registration({ actor_id: actor.admin })),
      /OPERATIONS_INVALID_INPUT/,
    );
  } finally {
    await db.close();
  }
});
