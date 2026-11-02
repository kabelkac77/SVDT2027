import { CrewEntry, crewMoneyInput, nullableCrewMoney } from "./crew-model";
export type TaskStatus =
  "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export const taskLabels: Record<TaskStatus, string> = {
  todo: "Čeká",
  in_progress: "Probíhá",
  blocked: "Blokováno",
  done: "Hotovo",
  cancelled: "Zrušeno",
};
export type RegistrationStatus = "new" | "review" | "confirmed" | "cancelled";
export const registrationLabels: Record<RegistrationStatus, string> = {
  new: "Nová",
  review: "K ověření",
  confirmed: "Potvrzená",
  cancelled: "Zrušená",
};
export type Zone = {
  id: string;
  edition_id: string;
  name: string;
  instructions: string;
  color: string;
  leader_roster_id: string | null;
  contact_name: string;
  contact_phone: string;
  map_x: number | null;
  map_y: number | null;
  archived: boolean;
  version: number;
};
export type OperationTask = {
  id: string;
  edition_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_roster_id: string | null;
  zone_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  archived: boolean;
  version: number;
};
export type Registration = {
  id: string;
  edition_id: string;
  full_name: string;
  email: string;
  phone: string;
  category_label: string;
  bib: string;
  status: RegistrationStatus;
  fee_due: number | null;
  fee_paid: number | null;
  notes: string;
  archived: boolean;
  version: number;
};
export type RegistrationGrant = {
  edition_id: string;
  user_id: string;
  can_registration: boolean;
  version: number;
};
export type OperationKind =
  "zone" | "task" | "registration" | "registration_grant";
export type OperationsData = {
  zones: Zone[];
  tasks: OperationTask[];
  registrations: Registration[];
  grants: RegistrationGrant[];
  canRegistration: boolean;
};
export const operationFields: Record<OperationKind, readonly string[]> = {
  zone: [
    "id",
    "version",
    "name",
    "instructions",
    "color",
    "leader_roster_id",
    "contact_name",
    "contact_phone",
    "map_x",
    "map_y",
    "archived",
  ],
  task: [
    "id",
    "version",
    "title",
    "description",
    "status",
    "assignee_roster_id",
    "zone_id",
    "starts_at",
    "ends_at",
    "due_at",
    "archived",
  ],
  registration: [
    "id",
    "version",
    "full_name",
    "email",
    "phone",
    "category_label",
    "bib",
    "status",
    "fee_due",
    "fee_paid",
    "notes",
    "archived",
  ],
  registration_grant: ["user_id", "version", "can_registration"],
};
export function operationPayload(
  kind: OperationKind,
  value: object,
): Record<string, unknown> {
  const data = value as Record<string, unknown>;
  return Object.fromEntries(
    operationFields[kind]
      .filter((key) => Object.hasOwn(data, key))
      .map((key) => [key, data[key]]),
  );
}
export function newZone(edition_id: string, id: string): Zone {
  return {
    id,
    edition_id,
    name: "",
    instructions: "",
    color: "cat-0",
    leader_roster_id: null,
    contact_name: "",
    contact_phone: "",
    map_x: null,
    map_y: null,
    archived: false,
    version: 0,
  };
}
export function newTask(edition_id: string, id: string): OperationTask {
  return {
    id,
    edition_id,
    title: "",
    description: "",
    status: "todo",
    assignee_roster_id: null,
    zone_id: null,
    starts_at: null,
    ends_at: null,
    due_at: null,
    archived: false,
    version: 0,
  };
}
export function newRegistration(edition_id: string, id: string): Registration {
  return {
    id,
    edition_id,
    full_name: "",
    email: "",
    phone: "",
    category_label: "",
    bib: "",
    status: "new",
    fee_due: null,
    fee_paid: null,
    notes: "",
    archived: false,
    version: 0,
  };
}
export function localDateTime(value: string): string | null {
  if (value === "") return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) throw Error("Zadej platný místní čas akce.");
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const sec = second || 0;
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour > 23 ||
    minute > 59 ||
    sec > 59
  )
    throw Error("Zadej platný místní čas akce.");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0),
    days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > days[month - 1]) throw Error("Zadej platný místní čas akce.");
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || "00"}`;
}
export function dateTimeInput(value: string | null): string {
  if (!value) return "";
  const parsed = localDateTime(value)!;
  return parsed.endsWith(":00") ? parsed.slice(0, 16) : parsed;
}
export function dateTimeLabel(value: string | null): string {
  if (!value) return "Termín neurčen";
  const parsed = localDateTime(value)!;
  return `${parsed.slice(8, 10)}. ${parsed.slice(5, 7)}. ${parsed.slice(0, 4)} ${parsed.endsWith(":00") ? parsed.slice(11, 16) : parsed.slice(11, 19)}`;
}
export function taskTimeline(
  tasks: OperationTask[],
  editionId: string,
): OperationTask[] {
  return tasks
    .filter(
      (t) =>
        t.edition_id === editionId && !t.archived && t.status !== "cancelled",
    )
    .slice()
    .sort(
      (a, b) =>
        compareTaskTime(a, b) ||
        a.title.localeCompare(b.title, "cs") ||
        a.id.localeCompare(b.id),
    );
}
export function registrationPayment(
  r: Pick<Registration, "fee_due" | "fee_paid">,
): { label: string; remaining: number | null } {
  const due = r.fee_due,
    paid = r.fee_paid;
  for (const n of [due, paid])
    if (n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 99999999999))
      throw Error("Neplatná částka.");
  if (due === null || paid === null)
    return { label: "Úhrada k ověření", remaining: null };
  if (due === 0 && paid === 0) return { label: "Bez poplatku", remaining: 0 };
  if (paid > due) return { label: "Přeplatek", remaining: due - paid };
  if (paid === due) return { label: "Uhrazeno", remaining: 0 };
  return {
    label: paid === 0 ? "Neuhrazeno" : "Částečně uhrazeno",
    remaining: due - paid,
  };
}
export function zonePoint(zone: Zone): { x: number; y: number } | null {
  const x = zone.map_x,
    y = zone.map_y;
  return typeof x === "number" &&
    Number.isFinite(x) &&
    x >= 0 &&
    x <= 100 &&
    typeof y === "number" &&
    Number.isFinite(y) &&
    y >= 0 &&
    y <= 100
    ? { x, y }
    : null;
}
export function ownAssignments(
  entries: CrewEntry[],
  edition: string,
  userId: string,
): CrewEntry[] {
  return entries.filter(
    (e) =>
      e.edition_id === edition && e.linked_user_id === userId && !e.archived,
  );
}
export function operationsMessage(error: unknown): string {
  const raw = (error as { message?: unknown })?.message,
    text = typeof raw === "string" ? raw : "";
  if (/(CREW|OPERATIONS)_(VERSION_CONFLICT|REQUEST_REUSED)/.test(text))
    return "Záznam mezitím změnil někdo jiný. Načti aktuální údaje a zkontroluj změny.";
  if (/(CREW|OPERATIONS)_ACCESS_DENIED/.test(text))
    return "K této oblasti nemáš oprávnění.";
  if (/(CREW|OPERATIONS)_EDITION_ARCHIVED/.test(text))
    return "Archivovaný ročník nelze upravovat.";
  if (/OPERATIONS_(INVALID_INPUT|DUPLICATE)/.test(text))
    return "Zkontroluj vyplněné údaje, termíny a částky.";
  return "Údaje se nepodařilo načíst nebo uložit. Zkus to znovu.";
}
export { crewMoneyInput, nullableCrewMoney };

function compareTaskTime(a: OperationTask, b: OperationTask): number {
  const av = localDateTime(a.starts_at || a.due_at || ""),
    bv = localDateTime(b.starts_at || b.due_at || "");
  if (!av) return bv ? 1 : 0;
  if (!bv) return -1;
  return av.localeCompare(bv);
}

/** Canonical identity includes every transmitted scalar, its type, edition and operation. */
export function operationRequestFingerprint(edition: string, kind: OperationKind, payload: Record<string, unknown>): string {
  const fields = Object.keys(payload).sort().filter(key => payload[key] !== undefined).map(key => {
    const value = payload[key];
    if (value !== null && typeof value !== 'string' && typeof value !== 'boolean' && !(typeof value === 'number' && Number.isFinite(value))) throw Error('OPERATIONS_INVALID_INPUT');
    return [key,value];
  });
  return JSON.stringify([edition,kind,fields]);
}
export function isOperationAccessError(error: unknown): boolean {
  const value = error as {code?:unknown;message?:unknown}|null;
  return value?.code === '42501' || (typeof value?.message === 'string' && /(CREW|OPERATIONS)_ACCESS_DENIED/.test(value.message));
}
