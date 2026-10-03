export const statuses = [
  "neosloven",
  "osloven",
  "potvrzen",
  "zamítnut",
] as const;
export const fulfillmentStatuses = [
  "nesplněno",
  "v řešení",
  "splněno",
] as const;
export type Status = (typeof statuses)[number];
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];
export type Edition = {
  id: string;
  name: string;
  year: number;
  archived: boolean;
};
export type Member = {
  edition_id: string;
  user_id: string;
  display_name: string;
  role: "admin" | "manager" | "viewer";
};
export type Person = { id: string; name: string; email: string; phone: string };
export type Organization = {
  id: string;
  name: string;
  country_code: string;
  registration_id: string | null;
  website: string;
  primary_contact_id: string | null;
  version: number;
};
export type Prospect = {
  id: string;
  edition_id: string;
  organization_id: string;
  owner_id: string;
  status: Status;
  internal_note: string;
  next_contact_on: string | null;
  version: number;
};
export type Partnership = {
  id: string;
  edition_id: string;
  prospect_id: string;
  confirmed_at: string;
};
export type Deliverable = {
  id: string;
  edition_id: string;
  partnership_id: string;
  title: string;
  status: FulfillmentStatus;
  due_on: string | null;
  evidence_url: string;
  version: number;
};
export type PartnerHistoricalRecord = {
  id: string;
  organization_id: string;
  event_name: string;
  year: number;
  cash_amount_czk: number | null;
  fulfillment: string;
  position: string;
  source_ref: string;
};
export type Audit = {
  id: string;
  edition_id: string;
  actor_id: string;
  entity: string;
  entity_id: string;
  action: string;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
};
export type Data = {
  editions: Edition[];
  members: Member[];
  organizations: Organization[];
  people: Person[];
  prospects: Prospect[];
  partnerships: Partnership[];
  deliverables: Deliverable[];
  partnerHistory: PartnerHistoricalRecord[];
  audit: Audit[];
};
export type PartnerInput = {
  id?: string;
  organization_id?: string;
  version?: number;
  organization_version?: number;
  name: string;
  country_code: string;
  registration_id: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  owner_id: string;
  status: Status | "";
  internal_note: string;
  next_contact_on: string;
};
export type DeliverableInput = {
  id?: string;
  version?: number;
  partnership_id: string;
  title: string;
  status: FulfillmentStatus;
  due_on: string;
  evidence_url: string;
};
export const emptyPartner = (): PartnerInput => ({
  name: "",
  country_code: "CZ",
  registration_id: "",
  website: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  owner_id: "",
  status: "",
  internal_note: "",
  next_contact_on: "",
});
export function partnerInput(data: Data, p: Prospect): PartnerInput {
  const o = data.organizations.find((o) => o.id === p.organization_id)!;
  const c = data.people.find((c) => c.id === o.primary_contact_id);
  return {
    ...emptyPartner(),
    ...p,
    ...o,
    id: p.id,
    organization_id: o.id,
    version: p.version,
    organization_version: o.version,
    registration_id: o.registration_id || "",
    contact_name: c?.name || "",
    contact_email: c?.email || "",
    contact_phone: c?.phone || "",
    next_contact_on: p.next_contact_on || "",
  };
}
export function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}
export function validatePartner(p: PartnerInput) {
  if (!p.name.trim()) throw Error("Zadej název organizace.");
  if (!p.owner_id) throw Error("Vyber ownera pro tento ročník.");
  if (!statuses.includes(p.status as Status))
    throw Error("Vyber stav spolupráce pro tento ročník.");
  if (!/^[A-Za-z]{2}$/.test(p.country_code))
    throw Error("Zadej dvoupísmenný kód země, například CZ.");
  if (p.website && !isHttpUrl(p.website))
    throw Error("Zadej web jako úplnou https:// nebo http:// adresu.");
  if ((p.contact_email || p.contact_phone) && !p.contact_name.trim())
    throw Error("Ke kontaktu doplň jméno nebo název kontaktního místa.");
  if (p.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contact_email))
    throw Error(
      "Zadej jeden platný e-mail hlavního kontaktu. Další ponech v poznámce.",
    );
}
export function validateDeliverable(d: DeliverableInput) {
  if (!d.title.trim()) throw Error("Zadej název plnění.");
  if (!fulfillmentStatuses.includes(d.status))
    throw Error("Vyber stav plnění.");
  if (d.evidence_url && !isHttpUrl(d.evidence_url))
    throw Error("Důkaz musí být úplná https:// nebo http:// adresa.");
}
export function message(error: unknown) {
  const e = error as { message?: string; code?: string };
  const text = e?.message || String(error);
  if (text.includes("VERSION_CONFLICT"))
    return "Záznam mezitím upravil někdo jiný. Načti aktuální data a zkontroluj změny.";
  if (e?.code === "23505" || text.includes("DUPLICATE"))
    return "Organizace s tímto IČO nebo partner v tomto ročníku už existuje. Vyber existující záznam.";
  if (text.includes("EDITION_ARCHIVED"))
    return "Ročník je archivovaný. Změny nelze uložit.";
  if (text.includes("ACCESS_DENIED") || e?.code === "42501")
    return "K této změně nemáš oprávnění. Obnov data nebo kontaktuj správce.";
  if (text.includes("PARTNERSHIP_NOT_CONFIRMED"))
    return "Plnění lze upravovat pouze u potvrzeného partnerství.";
  if (text.includes("INVALID_OWNER"))
    return "Vyber ownera s právem správy tohoto ročníku.";
  return text;
}
export function todayPrague() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(
    new Date(),
  );
}
export function dateLabel(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("cs-CZ").format(new Date(date + "T12:00:00"))
    : "Bez termínu";
}
export function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("cs");
}

// Source rows may overlap: only one unambiguous historical amount is a total.
// This legacy import field is in whole CZK, unlike the Finance ledger in haléře.
export function historicalAmount(
  records: PartnerHistoricalRecord[],
): number | null {
  return records.length === 1 ? records[0].cash_amount_czk : null;
}
