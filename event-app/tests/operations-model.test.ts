import { test } from "node:test";
import assert from "node:assert/strict";
import {
  operationRequestFingerprint,
  isOperationAccessError,
  localDateTime,
  dateTimeInput,
  dateTimeLabel,
  taskTimeline,
  newTask,
  newZone,
  newRegistration,
  registrationPayment,
  operationPayload,
  ownAssignments,
  zonePoint,
  operationsMessage,
} from "../src/lib/operations-model";
import { emptyCrewEntry } from "../src/lib/crew-model";
test("event datetimes stay literal local Prague times independent of computer timezone", () => {
  for (const zone of ["UTC", "America/New_York", "Europe/Prague"]) {
    process.env.TZ = zone;
    assert.equal(localDateTime("2027-06-05T08:30"), "2027-06-05T08:30:00");
    assert.equal(dateTimeInput("2027-06-05 08:30:00"), "2027-06-05T08:30");
    assert.equal(dateTimeLabel("2027-06-05T08:30"), "05. 06. 2027 08:30");
  }
  assert.equal(localDateTime(""), null);
});
test("invalid dates, UTC/offset conversion, seconds and malformed values are refused", () => {
  for (const input of [
    "2027-02-29T08:00",
    "2027-02-30T08:00",
    "2027-13-01T08:00",
    "2027-01-01T24:00",
    "2027-01-01T08:60",
    "2027-01-01T08:00Z",
    "2027-01-01T08:00+01:00",
    "infinity",
    "0000-01-01T08:00",
  ])
    assert.throws(() => localDateTime(input));
  assert.equal(localDateTime("2028-02-29T08:00"), "2028-02-29T08:00:00");
});
test("registration confirmation and payment state remain independent; unknown is not free", () => {
  assert.deepEqual(registrationPayment({ fee_due: null, fee_paid: 0 }), {
    label: "Úhrada k ověření",
    remaining: null,
  });
  assert.equal(
    registrationPayment({ fee_due: 0, fee_paid: 0 }).label,
    "Bez poplatku",
  );
  assert.equal(
    registrationPayment({ fee_due: 100, fee_paid: null }).remaining,
    null,
  );
  assert.equal(
    registrationPayment({ fee_due: 100, fee_paid: 0 }).label,
    "Neuhrazeno",
  );
  assert.equal(
    registrationPayment({ fee_due: 100, fee_paid: 40 }).remaining,
    60,
  );
  assert.equal(
    registrationPayment({ fee_due: 100, fee_paid: 100 }).label,
    "Uhrazeno",
  );
  assert.deepEqual(registrationPayment({ fee_due: 100, fee_paid: 120 }), {
    label: "Přeplatek",
    remaining: -20,
  });
  for (const value of [NaN, Infinity, -1, 1.2, Number.MAX_SAFE_INTEGER])
    assert.throws(() => registrationPayment({ fee_due: value, fee_paid: 0 }));
});
test("task timeline isolates edition, omits archives and cancellations, sorts without mutating", () => {
  const a = {
      ...newTask("e1", "a"),
      title: "A",
      starts_at: "2027-06-05T09:00",
    },
    b = { ...newTask("e1", "b"), title: "B", due_at: "2027-06-05T08:00" },
    c = { ...newTask("e2", "c") },
    d = { ...newTask("e1", "d"), archived: true },
    e = { ...newTask("e1", "e"), status: "cancelled" as const };
  const input = [a, b, c, d, e];
  assert.deepEqual(
    taskTimeline(input, "e1").map((t) => t.id),
    ["b", "a"],
  );
  assert.equal(input[0], a);
});
test("new records have explicit caller identity and conservative unknown defaults", () => {
  assert.equal(newTask("e1", "a").version, 0);
  assert.equal(newZone("e1", "a").map_x, null);
  assert.equal(newRegistration("e1", "a").fee_due, null);
  assert.equal(newRegistration("e1", "a").status, "new");
});
test("write payloads exclude client role, other-module data and readonly edition metadata", () => {
  const p = operationPayload("task", {
    ...newTask("e1", "a"),
    role: "admin",
    fee_due: 1,
    actor_id: "spoof",
  });
  for (const key of ["role", "fee_due", "actor_id", "edition_id"])
    assert.ok(!Object.hasOwn(p, key));
  assert.equal(p.id, "a");
  assert.equal(p.version, 0);
});
test("map markers require both finite in-range positions and never guess a missing location", () => {
  const z = newZone("e1", "z");
  assert.equal(zonePoint(z), null);
  assert.deepEqual(zonePoint({ ...z, map_x: 0, map_y: 100 }), { x: 0, y: 100 });
  for (const pair of [
    [1, null],
    [-1, 0],
    [101, 0],
    [NaN, 1],
    [Infinity, 1],
    ["1", 1],
  ])
    assert.equal(
      zonePoint({ ...z, map_x: pair[0] as any, map_y: pair[1] as any }),
      null,
    );
});
test("own operational assignments are explicit user links, isolated by edition and archive", () => {
  const base = {
    ...emptyCrewEntry("c"),
    edition_id: "e1",
    linked_user_id: "u",
  };
  const rows = [
    base,
    { ...base, edition_id: "e2" },
    { ...base, linked_user_id: "other" },
    { ...base, archived: true },
  ];
  assert.deepEqual(ownAssignments(rows, "e1", "u"), [base]);
});
test("public operation errors never expose backend messages or private values", () => {
  assert.ok(
    !operationsMessage({ message: "private@example.invalid" }).includes(
      "private",
    ),
  );
  assert.ok(!operationsMessage({ message: 123 }).includes("123"));
  assert.match(
    operationsMessage(Error("OPERATIONS_VERSION_CONFLICT")),
    /změnil/,
  );
});

test("timeline normalizes server and input separators and preserves nonzero seconds", () => {
  const a = { ...newTask("e1", "a"), starts_at: "2027-06-05 09:00:00" },
    b = { ...newTask("e1", "b"), starts_at: "2027-06-05T08:00:00" };
  assert.deepEqual(
    taskTimeline([newTask("e1", "unscheduled"), a, b], "e1").map((r) => r.id),
    ["b", "a", "unscheduled"],
  );
  assert.equal(dateTimeInput("2027-06-05 08:30:45"), "2027-06-05T08:30:45");
  assert.equal(dateTimeLabel("2027-06-05 08:30:45"), "05. 06. 2027 08:30:45");
});

test('operation request identity includes typed amounts, edition, action and every payload field',()=>{
 const p={id:'synthetic',version:1,fee_due:null,fee_paid:0};const fp=operationRequestFingerprint('e1','registration',p);
 assert.equal(fp,operationRequestFingerprint('e1','registration',{fee_paid:0,fee_due:null,version:1,id:'synthetic',omitted:undefined}));
 for(const next of [{...p,fee_due:0},{...p,fee_paid:null},{...p,version:2},{...p,id:'other'},{...p,notes:'new'}])assert.notEqual(fp,operationRequestFingerprint('e1','registration',next));
 assert.notEqual(fp,operationRequestFingerprint('e2','registration',p));assert.notEqual(fp,operationRequestFingerprint('e1','task',p));
 for(const value of [NaN,Infinity,{},[],1n])assert.throws(()=>operationRequestFingerprint('e1','task',{value}),/OPERATIONS_INVALID_INPUT/);
});
test('operation access failures are recognized without exposing backend values',()=>{assert.equal(isOperationAccessError({code:'42501',message:'private'}),true);assert.equal(isOperationAccessError({message:'CREW_ACCESS_DENIED'}),true);assert.equal(isOperationAccessError({message:'OPERATIONS_ACCESS_DENIED'}),true);assert.equal(isOperationAccessError({message:'synthetic network error'}),false);assert.equal(isOperationAccessError(null),false);});
