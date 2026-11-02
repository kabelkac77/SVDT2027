"use client";

import { Fragment, type ReactNode } from "react";
import type { Edition } from "../lib/model";
import {
  coverageFor,
  crewEntryPayload,
  crewMoneyInput,
  crewStatuses,
  type CrewCategory,
  type CrewCompensation,
  type CrewData,
  type CrewEntry,
  type CrewWriteKind,
} from "../lib/crew-model";
import { CrewEntryEditor, CrewCompensationForm } from "./crew-forms";

export type CrewRosterProps = {
  edition: Edition;
  data: CrewData;
  userId: string;
  filters: { search: string; status: string; includeArchived: boolean };
  expanded: string[];
  draft: CrewEntry | null;
  anchorCategoryId: string | null;
  pendingKind: CrewWriteKind | null;
  saving: boolean;
  onToggle: (categoryId: string) => void;
  onOpen: (entryId: string) => void;
  onChange: (draft: CrewEntry) => void;
  onCancel: () => void;
  onSave: (
    kind: CrewWriteKind,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  onDirty: (kind: CrewWriteKind) => void;
};

const STATUS_ORDER = Object.keys(crewStatuses) as (keyof typeof crewStatuses)[];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function categoryColorClass(color: string): string {
  return /^cat-([0-9]|1[01])$/.test(color) ? color : "cat-11";
}

function matchesSearch(entry: CrewEntry, search: string): boolean {
  if (!search.trim()) return true;
  const needle = normalize(search.trim());
  return (
    normalize(entry.name).includes(needle) ||
    normalize(entry.position).includes(needle) ||
    normalize(entry.owner_label).includes(needle)
  );
}

function visibleEntries(
  category: CrewCategory,
  data: CrewData,
  filters: CrewRosterProps["filters"],
  userId: string,
  isTeamRole: boolean,
): CrewEntry[] {
  return data.entries.filter((entry) => {
    if (entry.edition_id !== category.edition_id) return false;
    if (entry.category_id !== category.id) return false;
    if (!filters.includeArchived && entry.archived) return false;
    if (filters.status !== "all" && entry.status !== filters.status)
      return false;
    if (!matchesSearch(entry, filters.search)) return false;
    if (!isTeamRole && entry.linked_user_id !== userId) return false;
    return true;
  });
}

function statusBadge(status: CrewEntry["status"]) {
  return (
    <span className={`crew-status-${status} badge`}>
      {crewStatuses[status]}
    </span>
  );
}

function coverageLabel(category: CrewCategory, entries: CrewEntry[]): string {
  const coverage = coverageFor(category, entries);
  const term = category.required_term.trim();
  if (coverage.state === "not-set") return "Neurčeno";
  if (coverage.state === "uncertain")
    return term ? `K ověření (${term})` : "K ověření";
  if (coverage.state === "covered")
    return term ? `Cíl pokryt (${term})` : "Cíl pokryt";
  return term
    ? `Chybí ${coverage.missing} (${term})`
    : `Chybí ${coverage.missing}`;
}

function findCompensation(
  data: CrewData,
  entryId: string | undefined,
): CrewCompensation | undefined {
  if (!entryId) return undefined;
  return data.compensation.find((fee) => fee.roster_id === entryId);
}

function moneyCell(
  data: CrewData,
  entry: CrewEntry,
  canFinance: boolean,
): string {
  if (!canFinance) return "Odměna neveřejná";
  const fee = findCompensation(data, entry.id);
  if (fee && fee.agreed !== null) return `${crewMoneyInput(fee.agreed)} Kč`;
  return "Částka neurčena";
}

export function CrewRosterView(props: CrewRosterProps) {
  const {
    edition,
    data,
    userId,
    filters,
    expanded,
    draft,
    anchorCategoryId,
    pendingKind,
    saving,
    onToggle,
    onOpen,
    onChange,
    onCancel,
    onSave,
    onDirty,
  } = props;

  const isTeamRole = data.role === "admin" || data.role === "coordinator";
  const canFinance = data.canFinance && isTeamRole;
  const hasRole = isTeamRole || data.role === "member";
  const scope: CrewData = {
    role: data.role,
    canFinance,
    categories: hasRole
      ? data.categories.filter((c) => c.edition_id === edition.id)
      : [],
    entries: hasRole
      ? data.entries.filter(
          (e) =>
            e.edition_id === edition.id &&
            (isTeamRole || e.linked_user_id === userId),
        )
      : [],
    members:
      data.role === "admin"
        ? data.members.filter((m) => m.edition_id === edition.id)
        : [],
    compensation: canFinance
      ? data.compensation.filter((f) => f.edition_id === edition.id)
      : [],
  };
  const editorDisabled =
    saving || (pendingKind !== null && pendingKind !== "roster");

  const categories = scope.categories
    .filter((c) => c.edition_id === edition.id)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  const draftVisible =
    hasRole &&
    !!draft &&
    draft.edition_id === edition.id &&
    (isTeamRole || draft.linked_user_id === userId);

  function renderDetail(entry: CrewEntry) {
    if (!draft) return null;
    const entryReadOnly = edition.archived || !isTeamRole;
    const compDisabled =
      saving ||
      edition.archived ||
      (pendingKind !== null && pendingKind !== "compensation");
    return (
      <div className="crew-detail-body">
        <button type="button" onClick={onCancel} disabled={saving}>
          Zavřít
        </button>
        <CrewEntryEditor
          draft={draft}
          data={scope}
          onChange={onChange}
          onSave={() => {
            void onSave("roster", crewEntryPayload(draft));
          }}
          onCancel={onCancel}
          disabled={editorDisabled}
          readOnly={entryReadOnly}
        />
        {canFinance ? (
          entry.id && scope.entries.some((saved) => saved.id === entry.id) ? (
            <CrewCompensationForm
              key={`${entry.id}:${findCompensation(scope, entry.id)?.version ?? 0}`}
              entryId={entry.id}
              fee={findCompensation(scope, entry.id)}
              onSave={onSave}
              onDirty={() => onDirty("compensation")}
              disabled={compDisabled}
            />
          ) : (
            <p>Nejdřív ulož záznam.</p>
          )
        ) : null}
      </div>
    );
  }

  function entryCells(entry: CrewEntry) {
    return (
      <>
        <td data-label="Stav">{statusBadge(entry.status)}</td>
        <td data-label="Pozice">{entry.position}</td>
        <td data-label="Kdo řeší">{entry.owner_label}</td>
        <td data-label="PÁ (od–do)">{entry.friday}</td>
        <td data-label="SO (od–do)">{entry.saturday}</td>
        <td data-label="Domluva">{moneyCell(scope, entry, canFinance)}</td>
        <td data-label="Rok">{edition.year}</td>
      </>
    );
  }

  return (
    <table className="crew-sheet">
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Stav</th>
          <th>Pozice</th>
          <th>Kdo řeší</th>
          <th>PÁ (od–do)</th>
          <th>SO (od–do)</th>
          <th>Domluva</th>
          <th>Rok</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => {
          const isExpanded = expanded.includes(category.id);
          const filtered = visibleEntries(
            category,
            scope,
            filters,
            userId,
            isTeamRole,
          );
          const counts = STATUS_ORDER.map((status) => ({
            status,
            count: filtered.filter((e) => e.status === status).length,
          }));
          const colorClass = categoryColorClass(category.color);

          const rows: ReactNode[] = [];
          if (isExpanded) {
            const shown = new Set<string>();
            const displayList: CrewEntry[] = [];
            for (const entry of filtered) {
              displayList.push(entry);
              if (entry.id) shown.add(entry.id);
            }
            if (draftVisible && draft?.id && anchorCategoryId === category.id) {
              const stored = scope.entries.find((e) => e.id === draft.id);
              if (
                stored &&
                stored.category_id === category.id &&
                stored.id &&
                !shown.has(stored.id)
              ) {
                displayList.push(stored);
              }
            }

            for (const entry of displayList) {
              const isOpen =
                draftVisible && !!draft && !!entry.id && draft.id === entry.id;
              rows.push(
                <tr
                  key={entry.id}
                  className={colorClass}
                  onClick={() => entry.id && onOpen(entry.id)}
                >
                  <td data-label="Jméno">
                    <button
                      type="button"
                      className="crew-row-button"
                      aria-expanded={isOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (entry.id) onOpen(entry.id);
                      }}
                    >
                      {entry.name}
                    </button>
                  </td>
                  {entryCells(entry)}
                </tr>,
              );
              if (isOpen && draft) {
                rows.push(
                  <tr key={`${entry.id}-detail`} className="crew-detail">
                    <td colSpan={8}>{renderDetail(entry)}</td>
                  </tr>,
                );
              }
            }

            if (
              draftVisible &&
              draft &&
              !scope.entries.some((saved) => saved.id === draft.id) &&
              anchorCategoryId === category.id
            ) {
              rows.push(
                <tr key="new-draft" className={colorClass}>
                  <td data-label="Jméno">{draft.name || "(bez jména)"}</td>
                  {entryCells(draft)}
                </tr>,
              );
              rows.push(
                <tr key="new-draft-detail" className="crew-detail">
                  <td colSpan={8}>{renderDetail(draft)}</td>
                </tr>,
              );
            }
          }

          return (
            <Fragment key={category.id}>
              <tr className={`crew-group-row crew-category ${colorClass}`}>
                <th colSpan={8}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => onToggle(category.id)}
                  >
                    {category.name} ({filtered.length})
                    <span className="crew-summary">
                      {counts
                        .filter((item) => item.count > 0)
                        .map(({ status, count }) => (
                          <span
                            key={status}
                            className={`crew-status-${status} badge`}
                          >
                            {crewStatuses[status]}: {count}
                          </span>
                        ))}
                    </span>
                    <span className="crew-coverage">
                      {isTeamRole
                        ? coverageLabel(category, scope.entries)
                        : "Moje přiřazení"}
                    </span>
                  </button>
                </th>
              </tr>
              {rows}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
