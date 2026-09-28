import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const sql = await readFile(
  new URL("../supabase/migrations/202609280001_partners.sql", import.meta.url),
  "utf8",
);
const user = "00000000-0000-0000-0000-000000000001",
  viewer = "00000000-0000-0000-0000-000000000002",
  outsider = "00000000-0000-0000-0000-000000000003";
const event = "10000000-0000-0000-0000-000000000001",
  e1 = "20000000-0000-0000-0000-000000000001",
  e2 = "20000000-0000-0000-0000-000000000002";
async function setup() {
  const db = new PGlite();
  await db.exec(
    `create schema auth;create table auth.users(id uuid primary key);create role anon nologin;create role authenticated nologin;grant usage on schema public,auth to authenticated;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  await db.exec(sql);
  await db.exec(
    `insert into auth.users values('${user}'),('${viewer}'),('${outsider}');insert into events(id,name) values('${event}','Test');insert into editions(id,event_id,year,name) values('${e1}','${event}',2027,'2027'),('${e2}','${event}',2028,'2028');insert into edition_members values('${e1}','${user}','Admin','admin'),('${e1}','${viewer}','Viewer','viewer'),('${e2}','${user}','Admin','admin');`,
  );
  return db;
}
async function as(db: PGlite, id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const input = () => ({
  name: "Test partner",
  country_code: "CZ",
  registration_id: "00001234",
  website: "https://example.com",
  contact_name: "Kontakt",
  contact_email: "a@example.com",
  contact_phone: "",
  owner_id: user,
  status: "osloven",
  internal_note: "Secret",
  next_contact_on: "2027-01-02",
});
async function save(db: PGlite, p: object, e = e1) {
  return (
    await db.query<{ id: string }>("select save_partner($1,$2::jsonb) id", [
      e,
      JSON.stringify(p),
    ])
  ).rows[0].id;
}
async function editInput(db: PGlite, id: string) {
  const p = (
    await db.query<any>("select * from partner_prospects where id=$1", [id])
  ).rows[0];
  const o = (
    await db.query<any>("select * from organizations where id=$1", [
      p.organization_id,
    ])
  ).rows[0];
  return {
    ...input(),
    id,
    organization_id: o.id,
    version: p.version,
    organization_version: o.version,
    status: p.status,
  };
}

test("confirmation is idempotent; status corrections preserve partnership; stale save rolls back profile/contact", async () => {
  const db = await setup();
  try {
    await as(db, user);
    const id = await save(db, input());
    assert.equal(
      (await db.query("select * from edition_partnerships")).rows.length,
      0,
    );
    const old = await editInput(db, id);
    await save(db, { ...old, status: "potvrzen" });
    const partner = (await db.query<any>("select * from edition_partnerships"))
      .rows[0];
    await assert.rejects(
      () =>
        save(db, { ...old, name: "Stale name", contact_name: "Stale contact" }),
      /VERSION_CONFLICT/,
    );
    assert.equal(
      (await db.query<any>("select name from organizations")).rows[0].name,
      "Test partner",
    );
    assert.equal(
      (await db.query<any>("select name from people")).rows[0].name,
      "Kontakt",
    );
    await save(db, { ...(await editInput(db, id)), status: "zamítnut" });
    await save(db, { ...(await editInput(db, id)), status: "potvrzen" });
    assert.equal(
      (await db.query<any>("select id from edition_partnerships")).rows[0].id,
      partner.id,
    );
    assert.equal(
      (await db.query("select * from edition_partnerships")).rows.length,
      1,
    );
    assert.equal((await db.query("select * from audit_log")).rows.length, 4);
  } finally {
    await db.close();
  }
});

test("RLS denies outsiders; viewer cannot mutate; browser cannot write tables or audit", async () => {
  const db = await setup();
  try {
    await as(db, user);
    const id = await save(db, input());
    await as(db, outsider);
    for (const table of [
      "editions",
      "events",
      "edition_members",
      "organizations",
      "people",
      "partner_prospects",
      "edition_partnerships",
      "audit_log",
    ])
      assert.equal(
        (await db.query(`select * from ${table}`)).rows.length,
        0,
        table,
      );
    await assert.rejects(() => save(db, input()), /ACCESS_DENIED/);
    await as(db, viewer);
    assert.equal(
      (await db.query("select * from partner_prospects")).rows.length,
      1,
    );
    await assert.rejects(() => save(db, input()), /ACCESS_DENIED/);
    await as(db, user);
    await assert.rejects(
      () =>
        db.exec(
          `update partner_prospects set internal_note='tamper' where id='${id}'`,
        ),
      /permission denied/,
    );
    await assert.rejects(
      () => db.exec("delete from audit_log"),
      /permission denied/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(() => save(db, input()), /permission denied/);
  } finally {
    await db.close();
  }
});

test("editions isolate state; global organization is reused; archive blocks writes; duplicates roll back", async () => {
  const db = await setup();
  try {
    await as(db, user);
    const id = await save(db, { ...input(), status: "potvrzen" });
    let current = await editInput(db, id);
    const { id: _, version: __, ...newEdition } = current;
    const p2 = await save(db, { ...newEdition, status: "osloven" }, e2);
    assert.equal(
      (await db.query("select * from organizations")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<any>(
          "select status from partner_prospects where id=$1",
          [p2],
        )
      ).rows[0].status,
      "osloven",
    );
    current = await editInput(db, id);
    await assert.rejects(() => save(db, { ...input() }), /duplicate key/);
    assert.equal((await db.query("select * from people")).rows.length, 1);
    await db.exec(
      `reset role;update editions set archived=true where id='${e1}'`,
    );
    await as(db, user);
    await assert.rejects(() => save(db, current), /EDITION_ARCHIVED/);
    assert.equal(
      (await db.query("select * from partner_prospects")).rows.length,
      2,
    );
  } finally {
    await db.close();
  }
});

test("deliverables validate edition, owner, status, URL and version; audit actor is authenticated identity", async () => {
  const db = await setup();
  try {
    await as(db, user);
    await assert.rejects(
      () => save(db, { ...input(), owner_id: viewer }),
      /INVALID_OWNER/,
    );
    const id = await save(db, { ...input(), status: "potvrzen" });
    const s = (await db.query<any>("select id from edition_partnerships"))
      .rows[0].id;
    const call = (payload: object, e = e1) =>
      db.query<any>("select save_deliverable($1,$2::jsonb) id", [
        e,
        JSON.stringify(payload),
      ]);
    const d = {
      partnership_id: s,
      title: "Logo",
      status: "nesplněno",
      evidence_url: "",
      due_on: "",
    };
    await assert.rejects(() => call(d, e2), /PARTNERSHIP_NOT_CONFIRMED/);
    await assert.rejects(
      () => call({ ...d, evidence_url: "javascript:alert(1)" }),
      /check constraint/,
    );
    const did = (await call(d)).rows[0].id;
    await call({
      ...d,
      id: did,
      version: 1,
      status: "splněno",
      evidence_url: "https://example.com/proof",
    });
    await assert.rejects(
      () => call({ ...d, id: did, version: 1 }),
      /VERSION_CONFLICT/,
    );
    await save(db, { ...(await editInput(db, id)), status: "zamítnut" });
    await assert.rejects(
      () => call({ ...d, id: did, version: 2 }),
      /PARTNERSHIP_NOT_CONFIRMED/,
    );
    const audit = (await db.query<any>("select * from audit_log")).rows;
    assert(audit.every((a) => a.actor_id === user));
    assert.equal(audit.length, 4);
  } finally {
    await db.close();
  }
});
