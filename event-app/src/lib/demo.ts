import {
  Data,
  PartnerInput,
  DeliverableInput,
  Status,
  validatePartner,
  validateDeliverable,
} from "./model";
export const demoUser = "demo-admin";
const key = "svdt-partners-demo-v1";
export function freshDemo(): Data {
  return {
    editions: [
      { id: "2027", name: "SVDT 2027", year: 2027, archived: false },
      { id: "2026", name: "SVDT 2026", year: 2026, archived: true },
    ],
    members: [
      {
        edition_id: "2027",
        user_id: demoUser,
        display_name: "Ukázkový správce",
        role: "admin",
      },
      {
        edition_id: "2027",
        user_id: "demo-owner",
        display_name: "Ukázkový owner",
        role: "manager",
      },
      {
        edition_id: "2026",
        user_id: demoUser,
        display_name: "Ukázkový správce",
        role: "admin",
      },
    ],
    organizations: [
      {
        id: "o1",
        name: "Ukázka · Horský servis",
        country_code: "CZ",
        registration_id: null,
        website: "",
        primary_contact_id: "c1",
        version: 1,
      },
      {
        id: "o2",
        name: "Ukázka · Městská kavárna",
        country_code: "CZ",
        registration_id: null,
        website: "",
        primary_contact_id: null,
        version: 1,
      },
      {
        id: "o3",
        name: "Ukázka · Sportovní dílna",
        country_code: "CZ",
        registration_id: null,
        website: "",
        primary_contact_id: null,
        version: 1,
      },
    ],
    people: [
      {
        id: "c1",
        name: "Ukázkový kontakt",
        email: "partner@example.com",
        phone: "",
      },
    ],
    prospects: [
      {
        id: "p1",
        edition_id: "2027",
        organization_id: "o1",
        owner_id: demoUser,
        status: "potvrzen",
        internal_note: "Fiktivní data pro vyzkoušení aplikace.",
        next_contact_on: "2027-03-15",
        version: 1,
      },
      {
        id: "p2",
        edition_id: "2027",
        organization_id: "o2",
        owner_id: "demo-owner",
        status: "osloven",
        internal_note: "Domluvit podobu spolupráce.",
        next_contact_on: null,
        version: 1,
      },
      {
        id: "p3",
        edition_id: "2027",
        organization_id: "o3",
        owner_id: demoUser,
        status: "zamítnut",
        internal_note: "Ukázka zamítnutého oslovení.",
        next_contact_on: null,
        version: 1,
      },
      {
        id: "p4",
        edition_id: "2026",
        organization_id: "o1",
        owner_id: demoUser,
        status: "potvrzen",
        internal_note: "Historický záznam.",
        next_contact_on: null,
        version: 1,
      },
    ],
    partnerships: [
      {
        id: "s1",
        edition_id: "2027",
        prospect_id: "p1",
        confirmed_at: "2026-09-28T12:00:00Z",
      },
      {
        id: "s2",
        edition_id: "2026",
        prospect_id: "p4",
        confirmed_at: "2026-01-01T12:00:00Z",
      },
    ],
    deliverables: [
      {
        id: "d1",
        edition_id: "2027",
        partnership_id: "s1",
        title: "Logo na webu akce",
        status: "v řešení",
        due_on: "2027-03-01",
        evidence_url: "",
        version: 1,
      },
      {
        id: "d2",
        edition_id: "2027",
        partnership_id: "s1",
        title: "Fotografie brandingu po akci",
        status: "nesplněno",
        due_on: null,
        evidence_url: "",
        version: 1,
      },
    ],
    audit: [],
  };
}
export function readDemo(): Data {
  const saved = localStorage.getItem(key);
  if (!saved) return freshDemo();
  const d = JSON.parse(saved);
  if (!d?.editions || !d?.prospects)
    throw Error("Ukázková data nelze načíst. Obnov demo.");
  return d;
}
export function resetDemo() {
  localStorage.removeItem(key);
  return freshDemo();
}
function assertEdit(d: Data, e: string) {
  if (d.editions.find((x) => x.id === e)?.archived)
    throw Error("EDITION_ARCHIVED");
}
export function writeDemoPartner(e: string, input: PartnerInput) {
  validatePartner(input);
  const d = readDemo();
  assertEdit(d, e);
  const old = input.id
    ? d.prospects.find((p) => p.id === input.id && p.edition_id === e)
    : undefined;
  let o = d.organizations.find((o) => o.id === input.organization_id);
  if ((input.id && !old) || (input.organization_id && !o))
    throw Error("ACCESS_DENIED");
  if (old && old.organization_id !== o?.id) throw Error("ACCESS_DENIED");
  if (
    (old && old.version !== input.version) ||
    (o && o.version !== input.organization_version)
  )
    throw Error("VERSION_CONFLICT");
  if (
    !d.members.some(
      (m) =>
        m.edition_id === e &&
        m.user_id === input.owner_id &&
        m.role !== "viewer",
    )
  )
    throw Error("INVALID_OWNER");
  if (
    d.organizations.some(
      (x) =>
        x.id !== o?.id &&
        input.registration_id.trim() &&
        x.country_code === input.country_code.toUpperCase() &&
        x.registration_id === input.registration_id.trim(),
    )
  )
    throw Error("DUPLICATE");
  if (
    !old &&
    o &&
    d.prospects.some((p) => p.edition_id === e && p.organization_id === o!.id)
  )
    throw Error("DUPLICATE");
  const before = old
    ? structuredClone({
        prospect: old,
        organization: o,
        contact: d.people.find((c) => c.id === o?.primary_contact_id),
      })
    : null;
  let cid = o?.primary_contact_id || null;
  if (input.contact_name.trim()) {
    cid ||= crypto.randomUUID();
    const c = {
      id: cid,
      name: input.contact_name.trim(),
      email: input.contact_email,
      phone: input.contact_phone,
    };
    d.people = d.people.filter((x) => x.id !== cid).concat(c);
  } else cid = null;
  const org = {
    id: o?.id || crypto.randomUUID(),
    name: input.name.trim(),
    country_code: input.country_code.toUpperCase(),
    registration_id: input.registration_id.trim() || null,
    website: input.website,
    primary_contact_id: cid,
    version: (o?.version || 0) + 1,
  };
  d.organizations = d.organizations.filter((x) => x.id !== org.id).concat(org);
  o = org;
  const p = {
    id: old?.id || crypto.randomUUID(),
    edition_id: e,
    organization_id: o.id,
    owner_id: input.owner_id,
    status: input.status as Status,
    internal_note: input.internal_note,
    next_contact_on: input.next_contact_on || null,
    version: (old?.version || 0) + 1,
  };
  d.prospects = d.prospects.filter((x) => x.id !== p.id).concat(p);
  if (
    p.status === "potvrzen" &&
    !d.partnerships.some((s) => s.prospect_id === p.id)
  )
    d.partnerships.push({
      id: crypto.randomUUID(),
      edition_id: e,
      prospect_id: p.id,
      confirmed_at: new Date().toISOString(),
    });
  d.audit.push({
    id: crypto.randomUUID(),
    edition_id: e,
    actor_id: demoUser,
    entity: "partner",
    entity_id: p.id,
    action: old ? "updated" : "created",
    old_data: before,
    new_data: { prospect: p, organization: o },
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(d));
  return p.id;
}
export function writeDemoDeliverable(e: string, input: DeliverableInput) {
  validateDeliverable(input);
  const d = readDemo();
  assertEdit(d, e);
  const s = d.partnerships.find(
    (x) => x.id === input.partnership_id && x.edition_id === e,
  );
  if (
    !s ||
    d.prospects.find((p) => p.id === s.prospect_id)?.status !== "potvrzen"
  )
    throw Error("PARTNERSHIP_NOT_CONFIRMED");
  const old = d.deliverables.find(
    (x) => x.id === input.id && x.partnership_id === s.id && x.edition_id === e,
  );
  if (input.id && !old) throw Error("ACCESS_DENIED");
  if (old && old.version !== input.version) throw Error("VERSION_CONFLICT");
  const row = {
    ...input,
    id: old?.id || crypto.randomUUID(),
    edition_id: e,
    due_on: input.due_on || null,
    version: (old?.version || 0) + 1,
  };
  d.deliverables = d.deliverables.filter((x) => x.id !== row.id).concat(row);
  d.audit.push({
    id: crypto.randomUUID(),
    edition_id: e,
    actor_id: demoUser,
    entity: "deliverable",
    entity_id: row.id,
    action: old ? "updated" : "created",
    old_data: old || null,
    new_data: row,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(d));
  return row.id;
}
