"use client";

import type { ReactNode } from "react";
import type { Edition } from "../lib/model";
import type { CrewData } from "../lib/crew-model";
import {
  type OperationsData,
  type OperationTask,
  type Registration,
  type RegistrationStatus,
  type TaskStatus,
  type Zone,
  taskLabels,
  registrationLabels,
  registrationPayment,
  taskTimeline,
  dateTimeLabel,
  localDateTime,
  zonePoint,
  ownAssignments,
} from "../lib/operations-model";

export type OperationView =
  | "tasks"
  | "timeline"
  | "zones"
  | "registrations"
  | "service";

type OperationsViewsProps = {
  edition: Edition;
  crew: CrewData;
  userId: string;
  data: OperationsData;
  view: OperationView;
  search: string;
  status: string;
  includeArchived: boolean;
  onOpen: (kind: "task" | "zone" | "registration", id: string) => void;
  renderDetail: (
    kind: "task" | "zone" | "registration",
    id: string,
  ) => ReactNode;
};

const CATEGORY_COLORS = [
  "cat-0", "cat-1", "cat-2", "cat-3", "cat-4", "cat-5",
  "cat-6", "cat-7", "cat-8", "cat-9", "cat-10", "cat-11",
];

function categoryClass(color: string): string {
  return `crew-category ${CATEGORY_COLORS.includes(color) ? color : "cat-0"}`;
}

function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return /\d/.test(digits) ? `tel:${digits}` : null;
}

function dayLabel(day: string | null): string {
  if (!day) return "Den neurčen";
  return `${day.slice(8, 10)}. ${day.slice(5, 7)}. ${day.slice(0, 4)}`;
}

export function OperationsViews(props: OperationsViewsProps) {
  const {
    edition,
    crew,
    userId,
    data,
    view,
    search,
    status,
    includeArchived,
    onOpen,
    renderDetail,
  } = props;

  const role = crew.role;
  const isCrew = role === "admin" || role === "coordinator" || role === "member";
  const isEditor = role === "admin" || role === "coordinator";
  const canSeeArchived = isEditor && includeArchived;
  const term = search.trim().toLowerCase();

  function ownIds(): Set<string> {
    return new Set(
      ownAssignments(crew.entries, edition.id, userId)
        .map((e) => e.id)
        .filter((id): id is string => typeof id === "string"),
    );
  }

  function crewLabel(id: string | null): string {
    if (!id) return "Nepřiřazeno";
    const entry = crew.entries.find(
      (e) => e.id === id && e.edition_id === edition.id,
    );
    if (!entry) return "Přiřazená osoba";
    if (!isEditor && entry.linked_user_id !== userId) return "Přiřazená osoba";
    return entry.name.trim() ? entry.name : "Přiřazená osoba";
  }

  function zoneLabel(zoneId: string | null): string {
    if (!zoneId) return "Zóna neurčena";
    const zone = data.zones.find(
      (z) => z.id === zoneId && z.edition_id === edition.id,
    );
    return zone && zone.name.trim() ? zone.name : "Zóna neurčena";
  }

  function taskStatusFilter(): TaskStatus | null {
    return status !== "all" && status in taskLabels ? (status as TaskStatus) : null;
  }

  function registrationStatusFilter(): RegistrationStatus | null {
    return status !== "all" && status in registrationLabels
      ? (status as RegistrationStatus)
      : null;
  }

  function scopedTasks(): OperationTask[] {
    const own = ownIds();
    let list = data.tasks.filter((t) => t.edition_id === edition.id);
    if (!isEditor)
      list = list.filter(
        (t) => t.assignee_roster_id !== null && own.has(t.assignee_roster_id),
      );
    if (!canSeeArchived) list = list.filter((t) => !t.archived);
    const statusFilter = taskStatusFilter();
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (term) list = list.filter((t) => t.title.toLowerCase().includes(term));
    return list;
  }

  function scopedTimeline(): OperationTask[] {
    const own = ownIds();
    let list = taskTimeline(data.tasks, edition.id);
    if (!isEditor)
      list = list.filter(
        (t) => t.assignee_roster_id !== null && own.has(t.assignee_roster_id),
      );
    const statusFilter = taskStatusFilter();
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (term) list = list.filter((t) => t.title.toLowerCase().includes(term));
    return list;
  }

  function scopedZones(): Zone[] {
    let list = data.zones.filter((z) => z.edition_id === edition.id);
    if (!canSeeArchived) list = list.filter((z) => !z.archived);
    if (term) list = list.filter((z) => z.name.toLowerCase().includes(term));
    return list;
  }

  function scopedRegistrations(): Registration[] {
    let list = data.registrations.filter((r) => r.edition_id === edition.id);
    if (!canSeeArchived) list = list.filter((r) => !r.archived);
    const statusFilter = registrationStatusFilter();
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (term) list = list.filter((r) => r.full_name.toLowerCase().includes(term));
    return list;
  }

  function detail(kind: "task" | "zone" | "registration", id: string) {
    const content = renderDetail(kind,id);
    return content ? <div className="ops-detail">{content}</div> : null;
  }

  function renderTaskRow(t: OperationTask) {
    return (
      <li key={t.id} className="ops-row">
        <button type="button" onClick={() => onOpen("task", t.id)}>
          {t.title.trim() ? t.title : "Bez názvu"}
        </button>
        <span className="badge">{taskLabels[t.status]}</span>
        <span>Odpovědný: {crewLabel(t.assignee_roster_id)}</span>
        <span>Zóna: {zoneLabel(t.zone_id)}</span>
        <span>Začátek: {dateTimeLabel(t.starts_at)}</span>
        <span>Konec: {dateTimeLabel(t.ends_at)}</span>
        <span>Termín: {dateTimeLabel(t.due_at)}</span>
        {detail("task", t.id)}
      </li>
    );
  }

  if (!isCrew) return <p className="panel">K této oblasti nemáš oprávnění.</p>;

  if (view === "tasks") {
    const tasks = scopedTasks();
    return (
      <div className="panel">
        <p>Počet úkolů: {tasks.length} · Čas akce: Europe/Prague</p>
        {tasks.length === 0 ? (
          <p>Žádné úkoly neodpovídají zadaným podmínkám.</p>
        ) : (
          <ul className="ops-list">{tasks.map(renderTaskRow)}</ul>
        )}
      </div>
    );
  }

  if (view === "timeline") {
    const tasks = scopedTimeline();
    const groups = new Map<string | null, OperationTask[]>();
    for (const t of tasks) {
      const day = localDateTime(t.starts_at || t.due_at || "")?.slice(0, 10) ?? null;
      const arr = groups.get(day) ?? [];
      arr.push(t);
      groups.set(day, arr);
    }
    const dayKeys = [...groups.keys()]
      .filter((k): k is string => k !== null)
      .sort();
    const ordered: (string | null)[] = [...dayKeys];
    if (groups.has(null)) ordered.push(null);
    return (
      <div className="panel">
        <p>Počet úkolů v harmonogramu: {tasks.length} · Čas akce: Europe/Prague</p>
        {tasks.length === 0 ? (
          <p>V harmonogramu nejsou žádné úkoly.</p>
        ) : (
          ordered.map((day) => (
            <section key={day ?? "unknown"}>
              <h3>{dayLabel(day)}</h3>
              <ul className="ops-list">
                {(groups.get(day) ?? []).map(renderTaskRow)}
              </ul>
            </section>
          ))
        )}
      </div>
    );
  }

  if (view === "zones") {
    const zones = scopedZones();
    const placed = zones.filter((z) => !z.archived && zonePoint(z));
    const unplaced = zones.filter((z) => !placed.includes(z));
    return (
      <div className="panel">
        <p>Počet zón: {zones.length}</p>
        <figure>
          <svg
            viewBox="0 0 100 100"
            role="group"
            aria-label="Orientační plán zón — bez mapového podkladu"
          >
            {placed.map((z) => {
              const point = zonePoint(z)!;
              return (
                <circle
                  key={z.id}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  tabIndex={0}
                  role="button"
                  aria-label={`Otevřít zónu ${z.name || "bez názvu"}`}
                  className={categoryClass(z.color)}
                  onClick={() => onOpen("zone", z.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen("zone", z.id);
                    }
                  }}
                />
              );
            })}
          </svg>
          <figcaption>Orientační plán zón — bez mapového podkladu</figcaption>
        </figure>
        {unplaced.length > 0 && (
          <div>
            <p>Zóny bez umístění v plánu: {unplaced.length}</p>
            <ul className="ops-list">
              {unplaced.map((z) => (
                <li key={z.id} className={`ops-row ${categoryClass(z.color)}`}>
                  {z.name || "Zóna bez názvu"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {zones.length === 0 ? (
          <p>Žádné zóny neodpovídají zadaným podmínkám.</p>
        ) : (
          <ul className="ops-list">
            {zones.map((z) => {
              const tel = telHref(z.contact_phone);
              return (
                <li key={z.id} className={`ops-row ${categoryClass(z.color)}`}>
                  <button type="button" onClick={() => onOpen("zone", z.id)}>
                    {z.name || "Zóna bez názvu"}
                  </button>
                  <span>Vedoucí: {crewLabel(z.leader_roster_id)}</span>
                  <span>Kontakt: {z.contact_name || "Neurčen"}</span>
                  <span>Telefon: {z.contact_phone || "Neurčen"}</span>
                  {tel && <a href={tel}>Zavolat</a>}
                  {z.instructions && (
                    <p style={{ whiteSpace: "pre-wrap" }}>{z.instructions}</p>
                  )}
                  {detail("zone", z.id)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (view === "registrations") {
    if (!data.canRegistration) {
      return <p className="panel">K registracím nemáš oprávnění.</p>;
    }
    const registrations = scopedRegistrations();
    return (
      <div className="panel">
        <p>Počet registrací: {registrations.length}</p>
        {registrations.length === 0 ? (
          <p>Žádné registrace neodpovídají zadaným podmínkám.</p>
        ) : (
          <ul className="ops-list">
            {registrations.map((r) => {
              const payment = registrationPayment(r);
              return (
                <li key={r.id} className="ops-row">
                  <button
                    type="button"
                    onClick={() => onOpen("registration", r.id)}
                  >
                    {r.full_name || "Bez jména"}
                  </button>
                  <span className="badge">{registrationLabels[r.status]}</span>
                  <span>Kategorie: {r.category_label || "Neurčena"}</span>
                  <span>Startovní číslo: {r.bib || "Nepřiděleno"}</span>
                  <span className="badge">{payment.label}</span>
                  {detail("registration", r.id)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const ownEntries = ownAssignments(crew.entries, edition.id, userId);
  if (ownEntries.length === 0) {
    return (
      <div className="panel">
        <p>Nemáš v tomto ročníku žádné přiřazení ve službě.</p>
      </div>
    );
  }
  const own = new Set(
    ownEntries.map((e) => e.id).filter((id): id is string => typeof id === "string"),
  );
  const myTasks = taskTimeline(data.tasks, edition.id).filter(
    (t) => t.assignee_roster_id !== null && own.has(t.assignee_roster_id),
  );
  return (
    <div className="panel">
      {ownEntries.map((entry) => {
        const category = crew.categories.find(
          (c) => c.id === entry.category_id && c.edition_id === edition.id,
        );
        return (
          <div key={entry.id ?? entry.category_id} className={`ops-service-card ${categoryClass(category?.color ?? "")}`}>
            <span className={categoryClass(category?.color ?? "")}>
              {category?.name || "Kategorie neurčena"}
            </span>
            <p>Pozice: {entry.position || "Neurčena"}</p>
            <p>Termín: {entry.term || "Neurčen"}</p>
            <p>Pátek: {entry.friday || "Neurčeno"}</p>
            <p>Sobota: {entry.saturday || "Neurčeno"}</p>
          </div>
        );
      })}
      <h3>Moje úkoly</h3>
      <p>Čas akce: Europe/Prague</p>
      <p>Počet mých úkolů: {myTasks.length}</p>
      {myTasks.length === 0 ? (
        <p>Nemáš přiřazené žádné úkoly.</p>
      ) : (
        <ul className="ops-list">
          {myTasks.map((t) => {
            const zone = t.zone_id
              ? data.zones.find(
                  (z) => z.id === t.zone_id && z.edition_id === edition.id,
                )
              : null;
            const tel = zone ? telHref(zone.contact_phone) : null;
            return (
              <li key={t.id} className="ops-row">
                <button type="button" onClick={() => onOpen("task", t.id)}>
                  {t.title.trim() ? t.title : "Bez názvu"}
                </button>
                <span className="badge">{taskLabels[t.status]}</span>
                <span>Začátek: {dateTimeLabel(t.starts_at)}</span>
                <span>Konec: {dateTimeLabel(t.ends_at)}</span>
                <span>Termín: {dateTimeLabel(t.due_at)}</span>
                {zone && (
                  <div>
                    <p>Zóna: {zone.name || "Zóna bez názvu"}</p>
                    {zone.instructions && (
                      <p style={{ whiteSpace: "pre-wrap" }}>{zone.instructions}</p>
                    )}
                    <p>Kontakt: {zone.contact_name || "Neurčen"}</p>
                    <p>Telefon: {zone.contact_phone || "Neurčen"}</p>
                    {tel && <a href={tel}>Zavolat</a>}
                  </div>
                )}
                {!zone && <p>Zóna a pracovní kontakt nejsou určené.</p>}
                {detail("task", t.id)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
