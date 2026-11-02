export const crewRoles = ["admin", "coordinator", "member"] as const;
export type CrewRole = (typeof crewRoles)[number];

export const crewStatuses: Record<
  "candidate" | "contacted" | "confirmed" | "declined" | "unknown",
  string
> = {
  candidate: "Neoslovený",
  contacted: "Poptaný",
  confirmed: "Potvrzený",
  declined: "Odmítl",
  unknown: "K ověření",
};
export type CrewStatus = keyof typeof crewStatuses;

export type CrewCategory = {
  id: string;
  edition_id: string;
  name: string;
  color: string;
  required_count: number | null;
  required_term: string;
  version: number;
};

export type CrewEntry = {
  id?: string;
  edition_id: string;
  category_id: string;
  person_id: string | null;
  linked_user_id: string | null;
  kind: "person" | "group" | "unresolved";
  name: string;
  position: string;
  owner_label: string;
  email: string;
  phone: string;
  status: CrewStatus;
  term: string;
  friday: string;
  saturday: string;
  notes: string;
  archived: boolean;
  version: number;
};

export type CrewCompensation = {
  roster_id: string;
  edition_id: string;
  estimate: number | null;
  agreed: number | null;
  total: number | null;
  paid: number | null;
  barter: string;
  merch: string;
  version: number;
};

export type CrewMembership = {
  edition_id: string;
  user_id: string;
  role: CrewRole;
  enabled: boolean;
  can_finance: boolean;
  version: number;
  email?: string;
};

export type CrewData = {
  role: CrewRole | null;
  canFinance: boolean;
  categories: CrewCategory[];
  entries: CrewEntry[];
  compensation: CrewCompensation[];
  members: CrewMembership[];
};

export type CrewWriteKind = "category" | "roster" | "compensation" | "member";

export function emptyCrewEntry(categoryId: string): CrewEntry {
  return {
    edition_id: "",
    category_id: categoryId,
    person_id: null,
    linked_user_id: null,
    kind: "unresolved",
    name: "",
    position: "",
    owner_label: "",
    email: "",
    phone: "",
    status: "candidate",
    term: "",
    friday: "",
    saturday: "",
    notes: "",
    archived: false,
    version: 0,
  };
}

export type CrewEntryPayload = {
  id?: string;
  version: number;
  category_id: string;
  person_id: string | null;
  linked_user_id: string | null;
  kind: CrewEntry["kind"];
  name: string;
  position: string;
  owner_label: string;
  email: string;
  phone: string;
  status: CrewStatus;
  term: string;
  friday: string;
  saturday: string;
  notes: string;
  archived: boolean;
};

export function crewEntryPayload(entry: CrewEntry): CrewEntryPayload {
  const payload: CrewEntryPayload = {
    version: entry.version,
    category_id: entry.category_id,
    person_id: entry.person_id,
    linked_user_id: entry.linked_user_id,
    kind: entry.kind,
    name: entry.name,
    position: entry.position,
    owner_label: entry.owner_label,
    email: entry.email,
    phone: entry.phone,
    status: entry.status,
    term: entry.term,
    friday: entry.friday,
    saturday: entry.saturday,
    notes: entry.notes,
    archived: entry.archived,
  };
  if (entry.id) payload.id = entry.id;
  return payload;
}

export type CrewCoverageState = "not-set" | "uncertain" | "missing" | "covered";
export type CrewCoverage = {
  required: number | null;
  confirmed: number;
  unresolved: number;
  missing: number | null;
  state: CrewCoverageState;
};

export function coverageFor(
  category: CrewCategory,
  entries: CrewEntry[],
): CrewCoverage {
  const required = category.required_count;
  const requiredTerm = category.required_term.trim();
  if (required === null || (required > 0 && requiredTerm === "")) {
    return { required, confirmed: 0, unresolved: 0, missing: null, state: "not-set" };
  }
  if (required === 0) {
    return { required: 0, confirmed: 0, unresolved: 0, missing: 0, state: "covered" };
  }
  const relevant = entries.filter(
    (e) =>
      e.edition_id === category.edition_id &&
      e.category_id === category.id &&
      !e.archived,
  );
  const matching = relevant.filter(
    (e) => e.status === "confirmed" && e.term.trim() === requiredTerm,
  );
  const confirmed = new Set(
    matching
      .filter((e) => e.kind === "person" && typeof e.person_id === "string" && e.person_id.trim() !== "")
      .map((e) => e.person_id as string),
  ).size;
  const unresolved = matching.filter((e) => e.kind !== "person" || typeof e.person_id !== "string" || e.person_id.trim() === "").length;
  if (confirmed >= required) {
    return { required, confirmed, unresolved, missing: 0, state: "covered" };
  }
  if (unresolved > 0) {
    return { required, confirmed, unresolved, missing: null, state: "uncertain" };
  }
  return { required, confirmed, unresolved, missing: required - confirmed, state: "missing" };
}

import { money } from "./finance";

const CREW_MONEY_LIMIT = 99999999999;

export function nullableCrewMoney(text: string): number | null {
  if (!text.trim()) return null;
  const value = money(text);
  if (value > CREW_MONEY_LIMIT) throw Error("Částka je příliš vysoká.");
  return value;
}

export function crewMoneyInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (!Number.isSafeInteger(value) || value < 0 || value > CREW_MONEY_LIMIT) throw Error("Neplatná částka.");
  const whole = Math.floor(value / 100);
  const cents = (value % 100).toString().padStart(2, "0");
  return `${whole},${cents}`;
}

export function crewMessage(error: unknown): string {
  const e = error as { message?: string };
  const text = typeof e?.message === "string" ? e.message : "";
  if (text.includes("CREW_VERSION_CONFLICT") || text.includes("CREW_REQUEST_REUSED"))
    return "Záznam mezitím upravil někdo jiný. Načti aktuální data a zkontroluj změny.";
  if (text.includes("CREW_EDITION_ARCHIVED"))
    return "Ročník je archivovaný. Změny nelze uložit.";
  if (text.includes("CREW_ACCESS_DENIED"))
    return "K této změně nemáš oprávnění ke sdílené crew. Obnov data nebo kontaktuj správce.";
  if (text.includes("CREW_ACCOUNT_AMBIGUOUS"))
    return "Stejný e-mail odpovídá více účtům. Správce musí upřesnit konkrétní účet.";
  if (text.includes("CREW_CONFIG_MISSING"))
    return "Sdílená evidence čeká na dokončení nastavení správcem.";
  if (text.includes("CREW_ACCOUNT_NOT_FOUND"))
    return "Pro zadaný e-mail neexistuje účet. Osoba se musí nejprve přihlásit.";
  if (text.includes("CREW_LAST_ADMIN"))
    return "Nelze odebrat posledního správce crew tohoto ročníku.";
  if (text.includes("CREW_INHERITED_ADMIN"))
    return "Tato osoba je správcem ročníku automaticky; roli crew nelze změnit.";
  if (
    text.includes("CREW_INVALID_INPUT") ||
    text.includes("CREW_INVALID_KIND") ||
    text.includes("CREW_CATEGORY_INVALID") ||
    text.includes("CREW_PERSON_INVALID") ||
    text.includes("CREW_ROSTER_INVALID") ||
    text.includes("CREW_DUPLICATE")
  )
    return "Zadané údaje nejsou platné. Zkontroluj formulář a zkus to znovu.";
  return "Změnu se nepodařilo uložit.";
}
