"use client";

import type { ReactNode } from "react";
import type { CrewData } from "../lib/crew-model";
import type { Edition } from "../lib/model";
import {
  OperationsData,
  ownAssignments,
  registrationLabels,
  taskLabels,
} from "../lib/operations-model";
import { OperationsEditor } from "./operations-forms";
import { OperationsViews, OperationView } from "./operations-views";
import { useOperationsWorkspace } from "./use-operations-workspace";

const TABS: { id: OperationView; label: string }[] = [
  { id: "tasks", label: "Úkoly" },
  { id: "timeline", label: "Harmonogram" },
  { id: "zones", label: "Zóny a plán" },
  { id: "service", label: "Moje služba" },
  { id: "registrations", label: "Registrace" },
];

function newDraftHeading(kind: "zone" | "task" | "registration"): string {
  if (kind === "zone") return "Nová zóna";
  if (kind === "task") return "Nový úkol";
  return "Nová registrace";
}

function kindList(
  data: OperationsData,
  kind: "zone" | "task" | "registration",
) {
  if (kind === "zone") return data.zones;
  if (kind === "task") return data.tasks;
  return data.registrations;
}

export function OperationsPanel({
  edition,
  crew,
  userId,
  onGuardChange,
}: {
  edition: Edition;
  crew: CrewData;
  userId: string;
  onGuardChange: (guard: () => boolean) => void;
}) {
  const {
    data,
    loading,
    saving,
    error,
    notice,
    selection,
    view,
    filters,
    canEdit,
    canRegister,
    changeView,
    changeFilters,
    open,
    create,
    openGrant,
    change,
    cancel,
    reload,
    save,
  } = useOperationsWorkspace({ edition, crew, userId, onGuardChange });

  if (!["admin", "coordinator", "member"].includes(crew.role ?? ""))
    return <p role="alert">K této oblasti nemáš oprávnění.</p>;

  const sanitizedCrew: CrewData = {
    role: crew.role,
    canFinance: false,
    categories: crew.categories.filter((c) => c.edition_id === edition.id),
    entries:
      crew.role === "member"
        ? ownAssignments(crew.entries, edition.id, userId)
        : crew.entries.filter((e) => e.edition_id === edition.id),
    compensation: [],
    members:
      crew.role === "admin"
        ? crew.members.filter((m) => m.edition_id === edition.id)
        : [],
  };

  const editionZones = (data?.zones ?? []).filter(
    (z) => z.edition_id === edition.id,
  );

  function renderDetail(
    kind: "task" | "zone" | "registration",
    id: string,
  ): ReactNode {
    if (
      !data ||
      !selection ||
      selection.kind === "registration_grant" ||
      selection.value.edition_id !== edition.id
    )
      return null;
    if (kind === "registration" && !data.canRegistration) return null;
    if (selection.kind !== kind || selection.value.id !== id) return null;
    return (
      <OperationsEditor
        key={`${selection.kind}:${selection.value.id}:${selection.value.version}`}
        kind={selection.kind}
        draft={selection.value}
        crew={sanitizedCrew}
        zones={editionZones}
        onChange={change}
        onSave={save}
        onCancel={cancel}
        disabled={saving}
        readOnly={selection.kind === "registration" ? !canRegister : !canEdit}
      />
    );
  }

  const newDraft =
    selection &&
    selection.kind !== "registration_grant" &&
    selection.value.version === 0 &&
    selection.value.edition_id === edition.id &&
    (selection.kind === "registration"
      ? Boolean(data?.canRegistration) && canRegister
      : canEdit)
      ? selection
      : null;
  const newDraftIsUnsaved =
    newDraft !== null &&
    (!data ||
      !kindList(data, newDraft.kind).some(
        (item) => item.id === newDraft.value.id,
      ));

  const tabs = TABS.filter(
    (t) => t.id !== "registrations" || data?.canRegistration,
  );

  const showStatusFilter =
    view === "tasks" || view === "timeline" || view === "registrations";
  const statusLabelsForView =
    view === "registrations" ? registrationLabels : taskLabels;
  const canArchiveFilter = crew.role === "admin" || crew.role === "coordinator";

  let newButtonKind: "task" | "zone" | "registration" | null = null;
  let newButtonLabel: string | null = null;
  if ((view === "tasks" || view === "timeline") && canEdit) {
    newButtonKind = "task";
    newButtonLabel = "Nový úkol";
  } else if (view === "zones" && canEdit) {
    newButtonKind = "zone";
    newButtonLabel = "Nová zóna";
  } else if (view === "registrations" && canRegister) {
    newButtonKind = "registration";
    newButtonLabel = "Nová registrace";
  }

  const grantAccountLabel =
    selection?.kind === "registration_grant"
      ? sanitizedCrew.members.find((m) => m.user_id === selection.value.user_id)
          ?.email || "Účet bez e-mailu"
      : null;

  return (
    <section className="ops-panel panel">
      <div className="section-heading compact">
        <h1>Provoz závodu</h1>
      </div>
      <div className="ops-tabs" role="group" aria-label="Provozní pohledy">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="ops-tab"
            aria-pressed={view === tab.id}
            disabled={saving}
            onClick={() => changeView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ops-toolbar">
        <label>
          Hledat
          <input
            type="search"
            name="operations-search"
            maxLength={200}
            value={filters.search}
            disabled={saving}
            onChange={(e) => changeFilters({ search: e.target.value })}
          />
        </label>
        {showStatusFilter && (
          <label>
            Stav
            <select
              value={filters.status}
              disabled={saving}
              onChange={(e) => changeFilters({ status: e.target.value })}
            >
              <option value="all">Vše</option>
              {Object.entries(statusLabelsForView).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {canArchiveFilter && (
          <label>
            <input
              type="checkbox"
              checked={filters.includeArchived}
              disabled={saving}
              onChange={(e) =>
                changeFilters({ includeArchived: e.target.checked })
              }
            />
            Zobrazit archivované
          </label>
        )}
        {newButtonKind && newButtonLabel && (
          <button
            type="button"
            disabled={saving || !data}
            onClick={() => create(newButtonKind!)}
          >
            {newButtonLabel}
          </button>
        )}
        <button type="button" disabled={saving} onClick={reload}>
          Obnovit
        </button>
      </div>

      {loading && <p role="status">Načítání…</p>}
      {error && (
        <div role="alert" className="error">
          <p>{error}</p>
          <button type="button" disabled={saving} onClick={reload}>
            Zkusit načíst znovu
          </button>
        </div>
      )}
      {notice && !error && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {data && (
        <>
          <p className="notice">
            Zobrazen je uložený snímek dat bez automatického obnovování v
            reálném čase a bez offline režimu; změny ostatních lidí se objeví až
            po Obnovit.
          </p>

          {newDraft && newDraftIsUnsaved && (
            <div className="ops-detail panel">
              <h3>{newDraftHeading(newDraft.kind)}</h3>
              <OperationsEditor
                key={`${newDraft.kind}:${newDraft.value.id}:0`}
                kind={newDraft.kind}
                draft={newDraft.value}
                crew={sanitizedCrew}
                zones={editionZones}
                onChange={change}
                onSave={save}
                onCancel={cancel}
                disabled={saving}
                readOnly={
                  newDraft.kind === "registration" ? !canRegister : !canEdit
                }
              />
            </div>
          )}

          <OperationsViews
            edition={edition}
            crew={sanitizedCrew}
            userId={userId}
            data={data}
            view={view}
            search={filters.search}
            status={filters.status}
            includeArchived={filters.includeArchived}
            onOpen={open}
            renderDetail={renderDetail}
          />

          {crew.role === "admin" && (
            <details className="ops-detail panel">
              <summary>Správa přístupu k registracím</summary>
              <p className="notice">
                Přístup k registracím je samostatné oprávnění nezávislé na roli
                crew. Kdo ho má, vidí a upravuje osobní údaje účastníků (jméno,
                kontakt, platby) — uděl ho jen těm, kdo registrace skutečně
                zpracovávají.
              </p>
              {sanitizedCrew.members.length === 0 && (
                <p>Žádné účty crew pro tento ročník.</p>
              )}
              <ul className="ops-list">
                {sanitizedCrew.members.map((m) => (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openGrant(m.user_id)}
                    >
                      {m.email || "Účet bez e-mailu"}
                    </button>
                  </li>
                ))}
              </ul>
              {selection?.kind === "registration_grant" &&
                selection.value.edition_id === edition.id &&
                sanitizedCrew.members.some(
                  (m) => m.user_id === selection.value.user_id,
                ) && (
                  <form
                    className="crew-form-grid"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!saving) void save(selection.value);
                    }}
                  >
                    <fieldset disabled={saving}>
                      <p>Přístup pro: {grantAccountLabel}</p>
                      <label>
                        <input
                          type="checkbox"
                          checked={selection.value.can_registration}
                          onChange={(e) =>
                            change({
                              ...selection.value,
                              can_registration: e.target.checked,
                            })
                          }
                        />
                        Může správovat registrace
                      </label>
                    </fieldset>
                    <div>
                      <button type="submit" disabled={saving}>
                        Uložit
                      </button>
                      <button type="button" disabled={saving} onClick={cancel}>
                        Zrušit
                      </button>
                    </div>
                  </form>
                )}
            </details>
          )}
        </>
      )}
    </section>
  );
}
