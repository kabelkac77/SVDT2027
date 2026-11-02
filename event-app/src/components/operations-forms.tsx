"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CrewData } from "../lib/crew-model";
import {
  crewMoneyInput,
  dateTimeInput,
  nullableCrewMoney,
  registrationLabels,
  taskLabels,
  type OperationTask,
  type Registration,
  type RegistrationStatus,
  type TaskStatus,
  type Zone,
} from "../lib/operations-model";

export type OperationDraft = Zone | OperationTask | Registration;

const CATEGORY_COLORS = [
  "Modrá",
  "Fialová",
  "Tyrkysová",
  "Oranžová",
  "Růžová",
  "Zelená",
  "Indigová",
  "Hnědá",
  "Olivová",
  "Azurová",
  "Vínová",
  "Šedá",
];

type Choice = { id: string; label: string };

function crewOptions(crew: CrewData, editionId: string): Choice[] {
  return crew.entries
    .filter(
      (e) => typeof e.id === "string" && e.edition_id === editionId && !e.archived,
    )
    .map((e) => ({ id: e.id as string, label: e.name.trim() || "Bez jména" }));
}

function zoneOptions(zones: Zone[], editionId: string): Choice[] {
  return zones
    .filter((z) => z.edition_id === editionId && !z.archived)
    .map((z) => ({ id: z.id, label: z.name.trim() || "Bez názvu" }));
}

function withHidden(options: Choice[], currentId: string | null, hiddenLabel: string): Choice[] {
  if (!currentId) return options;
  if (options.some((o) => o.id === currentId)) return options;
  return [...options, { id: currentId, label: hiddenLabel }];
}

function parseCoord(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function FormActions(props: { disabled: boolean; readOnly: boolean; onCancel: () => void }) {
  const { disabled, readOnly, onCancel } = props;
  return (
    <div>
      {!readOnly && (
        <button type="submit" disabled={disabled}>
          Uložit
        </button>
      )}
      <button type="button" onClick={onCancel} disabled={disabled}>
        {readOnly ? "Zpět" : "Zrušit"}
      </button>
    </div>
  );
}

function ZoneForm(props: {
  draft: Zone;
  crew: CrewData;
  onChange: (next: Zone) => void;
  onSave: (next: Zone) => void;
  onCancel: () => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { draft, crew, onChange, onSave, onCancel, disabled, readOnly } = props;
  const leaderOptions = useMemo(
    () => withHidden(crewOptions(crew, draft.edition_id), draft.leader_roster_id, "Přiřazený vedoucí"),
    [crew, draft.edition_id, draft.leader_roster_id],
  );

  function patch(changes: Partial<Zone>) {
    onChange({ ...draft, ...changes });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled || readOnly) return;
        onSave(draft);
      }}
    >
      <fieldset className="crew-form-grid" disabled={disabled || readOnly}>
        <label>
          Název
          <input
            type="text"
            name="name"
            required
            maxLength={150}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label>
          Pokyny pro oblast
          <textarea
            name="instructions"
            maxLength={10000}
            value={draft.instructions}
            onChange={(e) => patch({ instructions: e.target.value })}
          />
        </label>
        <label>
          Barva
          <select
            name="color"
            value={draft.color}
            onChange={(e) => patch({ color: e.target.value })}
          >
            {CATEGORY_COLORS.map((label, index) => (
              <option key={index} value={`cat-${index}`}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vedoucí oblasti
          <select
            name="leader_roster_id"
            value={draft.leader_roster_id ?? ""}
            onChange={(e) => patch({ leader_roster_id: e.target.value || null })}
          >
            <option value="">Nepřiřazeno</option>
            {leaderOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pracovní kontakt – jméno
          <input
            type="text"
            name="contact_name"
            maxLength={200}
            value={draft.contact_name}
            onChange={(e) => patch({ contact_name: e.target.value })}
          />
        </label>
        <label>
          Pracovní kontakt – telefon
          <input
            type="text"
            name="contact_phone"
            maxLength={100}
            value={draft.contact_phone}
            onChange={(e) => patch({ contact_phone: e.target.value })}
          />
        </label>
        <p>
          Tento kontakt uvidí celá crew. Nekopíruj sem soukromé telefonní číslo, zadej pracovní
          spojení na oblast.
        </p>
        <label>
          Pozice v plánu (%) – X
          <input
            type="number"
            name="map_x"
            min={0}
            max={100}
            step={0.001}
            value={draft.map_x ?? ""}
            onChange={(e) => patch({ map_x: parseCoord(e.target.value) })}
          />
        </label>
        <label>
          Pozice v plánu (%) – Y
          <input
            type="number"
            name="map_y"
            min={0}
            max={100}
            step={0.001}
            value={draft.map_y ?? ""}
            onChange={(e) => patch({ map_y: parseCoord(e.target.value) })}
          />
        </label>
        <p>
          Souřadnice jen umístí značku v plánku akce v procentech, nejde o skutečnou geolokaci.
        </p>
        <label>
          <input
            type="checkbox"
            name="archived"
            checked={draft.archived}
            onChange={(e) => patch({ archived: e.target.checked })}
          />
          Archivováno
        </label>
      </fieldset>
      <FormActions disabled={disabled} readOnly={readOnly} onCancel={onCancel} />
    </form>
  );
}

function TaskForm(props: {
  draft: OperationTask;
  crew: CrewData;
  zones: Zone[];
  onChange: (next: OperationTask) => void;
  onSave: (next: OperationTask) => void;
  onCancel: () => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { draft, crew, zones, onChange, onSave, onCancel, disabled, readOnly } = props;
  const assigneeOptions = useMemo(
    () =>
      withHidden(
        crewOptions(crew, draft.edition_id),
        draft.assignee_roster_id,
        "Přiřazený člen crew",
      ),
    [crew, draft.edition_id, draft.assignee_roster_id],
  );
  const zoneChoices = useMemo(
    () => withHidden(zoneOptions(zones, draft.edition_id), draft.zone_id, "Přiřazená oblast"),
    [zones, draft.edition_id, draft.zone_id],
  );

  function patch(changes: Partial<OperationTask>) {
    onChange({ ...draft, ...changes });
  }

  function patchDateTime(key: "starts_at" | "ends_at" | "due_at", raw: string) {
    patch({ [key]: raw === "" ? null : raw } as Partial<OperationTask>);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled || readOnly) return;
        onSave(draft);
      }}
    >
      <fieldset className="crew-form-grid" disabled={disabled || readOnly}>
        <label>
          Název úkolu
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label>
          Popis
          <textarea
            name="description"
            maxLength={10000}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
        <label>
          Stav
          <select
            name="status"
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as TaskStatus })}
          >
            {Object.entries(taskLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p>
          Stav „Hotovo“ nastavuje osoba s úpravou úkolů, běžná crew jej vidí jen ke čtení.
        </p>
        <label>
          Odpovědná osoba
          <select
            name="assignee_roster_id"
            value={draft.assignee_roster_id ?? ""}
            onChange={(e) => patch({ assignee_roster_id: e.target.value || null })}
          >
            <option value="">Nepřiřazeno</option>
            {assigneeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Oblast
          <select
            name="zone_id"
            value={draft.zone_id ?? ""}
            onChange={(e) => patch({ zone_id: e.target.value || null })}
          >
            <option value="">Bez oblasti</option>
            {zoneChoices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Začátek
          <input
            type="datetime-local"
            name="starts_at"
            step={1}
            value={dateTimeInput(draft.starts_at)}
            onChange={(e) => patchDateTime("starts_at", e.target.value)}
          />
        </label>
        <label>
          Konec
          <input
            type="datetime-local"
            name="ends_at"
            step={1}
            value={dateTimeInput(draft.ends_at)}
            onChange={(e) => patchDateTime("ends_at", e.target.value)}
          />
        </label>
        <label>
          Termín (deadline)
          <input
            type="datetime-local"
            name="due_at"
            step={1}
            value={dateTimeInput(draft.due_at)}
            onChange={(e) => patchDateTime("due_at", e.target.value)}
          />
        </label>
        <p>Časy se zadávají v místním čase akce (Europe/Prague), bez převodu na UTC.</p>
        <label>
          <input
            type="checkbox"
            name="archived"
            checked={draft.archived}
            onChange={(e) => patch({ archived: e.target.checked })}
          />
          Archivováno
        </label>
      </fieldset>
      <FormActions disabled={disabled} readOnly={readOnly} onCancel={onCancel} />
    </form>
  );
}

function RegistrationForm(props: {
  draft: Registration;
  onChange: (next: Registration) => void;
  onSave: (next: Registration) => void;
  onCancel: () => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { draft, onChange, onSave, onCancel, disabled, readOnly } = props;
  const [feeDueText, setFeeDueText] = useState(() => crewMoneyInput(draft.fee_due));
  const [feePaidText, setFeePaidText] = useState(() => crewMoneyInput(draft.fee_paid));
  const [error, setError] = useState("");

  function patch(changes: Partial<Registration>) {
    onChange({ ...draft, ...changes });
  }

  function handleFeeDueChange(text: string) {
    setFeeDueText(text);
    try {
      const parsed = nullableCrewMoney(text);
      onChange({ ...draft, fee_due: parsed });
    } catch {
      onChange({ ...draft });
    }
  }

  function handleFeePaidChange(text: string) {
    setFeePaidText(text);
    try {
      const parsed = nullableCrewMoney(text);
      onChange({ ...draft, fee_paid: parsed });
    } catch {
      onChange({ ...draft });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled || readOnly) return;
    setError("");
    let due: number | null;
    let paid: number | null;
    try {
      due = nullableCrewMoney(feeDueText);
      paid = nullableCrewMoney(feePaidText);
    } catch {
      setError("Zadaná částka není platná.");
      return;
    }
    onSave({ ...draft, fee_due: due, fee_paid: paid });
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="crew-form-grid" disabled={disabled || readOnly}>
        <label>
          Jméno a příjmení
          <input
            type="text"
            name="full_name"
            required
            maxLength={200}
            value={draft.full_name}
            onChange={(e) => patch({ full_name: e.target.value })}
          />
        </label>
        <label>
          E-mail
          <input
            type="text"
            name="email"
            maxLength={500}
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </label>
        <label>
          Telefon
          <input
            type="text"
            name="phone"
            maxLength={500}
            value={draft.phone}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </label>
        <label>
          Kategorie
          <input
            type="text"
            name="category_label"
            maxLength={150}
            value={draft.category_label}
            onChange={(e) => patch({ category_label: e.target.value })}
          />
        </label>
        <label>
          Startovní číslo
          <input
            type="text"
            name="bib"
            maxLength={30}
            value={draft.bib}
            onChange={(e) => patch({ bib: e.target.value })}
          />
        </label>
        <label>
          Stav
          <select
            name="status"
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as RegistrationStatus })}
          >
            {Object.entries(registrationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Poplatek k úhradě (Kč)
          <input
            type="text"
            name="fee_due"
            maxLength={40}
            inputMode="decimal"
            value={feeDueText}
            onChange={(e) => handleFeeDueChange(e.target.value)}
          />
        </label>
        <label>
          Uhrazeno (Kč)
          <input
            type="text"
            name="fee_paid"
            maxLength={40}
            inputMode="decimal"
            value={feePaidText}
            onChange={(e) => handleFeePaidChange(e.target.value)}
          />
        </label>
        <p>
          Úhradu zadávej ručně podle skutečně přijaté platby. Potvrzená registrace neznamená
          zaplacení, částka 0 Kč je jiný údaj než nevyplněná (neznámá) částka.
        </p>
        <label>
          Poznámka
          <textarea
            name="notes"
            maxLength={10000}
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="archived"
            checked={draft.archived}
            onChange={(e) => patch({ archived: e.target.checked })}
          />
          Archivováno
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <FormActions disabled={disabled} readOnly={readOnly} onCancel={onCancel} />
    </form>
  );
}

export function OperationsEditor(props: {
  kind: "zone" | "task" | "registration";
  draft: OperationDraft;
  crew: CrewData;
  zones: Zone[];
  onChange: (draft: OperationDraft) => void;
  onSave: (next: OperationDraft) => void;
  onCancel: () => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { kind, draft, crew, zones, onChange, onSave, onCancel, disabled, readOnly } = props;

  if (kind === "zone") {
    return (
      <ZoneForm
        draft={draft as Zone}
        crew={crew}
        onChange={onChange as (next: Zone) => void}
        onSave={onSave as (next: Zone) => void}
        onCancel={onCancel}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  }

  if (kind === "task") {
    return (
      <TaskForm
        draft={draft as OperationTask}
        crew={crew}
        zones={zones}
        onChange={onChange as (next: OperationTask) => void}
        onSave={onSave as (next: OperationTask) => void}
        onCancel={onCancel}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  }

  return (
    <RegistrationForm
      draft={draft as Registration}
      onChange={onChange as (next: Registration) => void}
      onSave={onSave as (next: Registration) => void}
      onCancel={onCancel}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
