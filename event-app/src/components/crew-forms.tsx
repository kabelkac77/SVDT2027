"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  crewMessage,
  crewMoneyInput,
  crewRoles,
  crewStatuses,
  nullableCrewMoney,
  type CrewCategory,
  type CrewCompensation,
  type CrewData,
  type CrewEntry,
  type CrewMembership,
  type CrewRole,
  type CrewWriteKind,
} from "../lib/crew-model";

export type SaveCrew = (
  kind: CrewWriteKind,
  payload: Record<string, unknown>,
) => Promise<boolean>;

const MONEY_ERROR = "Zadaná částka není platná.";
const SAVE_FAILED = "Změnu se nepodařilo uložit.";

function newId(): string { return crypto.randomUUID(); }

const crewKindLabels: Record<CrewEntry["kind"], string> = {
  unresolved: "Nevyjasněný",
  person: "Osoba",
  group: "Skupina",
};

const crewRoleLabels: Record<CrewRole, string> = {
  admin: "Správce",
  coordinator: "Koordinátor",
  member: "Člen",
};

type KnownPerson = { personId: string; label: string };

function knownPersons(data: CrewData, editionId: string): KnownPerson[] {
  const seen = new Map<string, string>();
  for (const entry of data.entries) {
    if (entry.edition_id !== editionId) continue;
    if (entry.kind !== "person") continue;
    if (!entry.person_id) continue;
    if (!seen.has(entry.person_id)) {
      seen.set(entry.person_id, entry.name.trim() || "Bez jména");
    }
  }
  return [...seen.entries()].map(([personId, label]) => ({ personId, label }));
}

export function CrewEntryEditor(props: {
  draft: CrewEntry;
  data: CrewData;
  onChange: (next: CrewEntry) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { draft, data, onChange, onSave, onCancel, disabled, readOnly } = props;
  const isAdmin = data.role === "admin";
  const persons = useMemo(
    () => knownPersons(data, draft.edition_id),
    [data, draft.edition_id],
  );
  const accountOptions = data.members.filter((m) => m.enabled);
  const hiddenLink =
    !!draft.linked_user_id &&
    !accountOptions.some((m) => m.user_id === draft.linked_user_id);

  function patch(changes: Partial<CrewEntry>) {
    onChange({ ...draft, ...changes });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <fieldset className="crew-form-grid" disabled={disabled || readOnly}>
        <label>
          Jméno
          <input
            type="text"
            name="name" required maxLength={200} value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <label>
          Kategorie
          <select
            value={draft.category_id}
            onChange={(e) => patch({ category_id: e.target.value })}
          >
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Druh
          <select
            value={draft.kind}
            onChange={(e) => {
              const kind = e.target.value as CrewEntry["kind"];
              patch({
                kind,
                person_id: kind === "person" ? draft.person_id : null,
              });
            }}
          >
            {(Object.keys(crewKindLabels) as CrewEntry["kind"][]).map((kind) => (
              <option key={kind} value={kind}>
                {crewKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        {draft.kind === "person" && (
          <label>
            Opakovaně použít osobu
            <select
              value={draft.person_id ?? ""}
              onChange={(e) => patch({ person_id: e.target.value || null })}
            >
              <option value="">Nová osoba</option>
              {persons.map((person) => (
                <option key={person.personId} value={person.personId}>
                  {person.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Pozice
          <input
            type="text"
            name="position" value={draft.position}
            onChange={(e) => patch({ position: e.target.value })}
          />
        </label>
        <label>
          Kdo řeší
          <input
            type="text"
            name="owner_label" value={draft.owner_label}
            onChange={(e) => patch({ owner_label: e.target.value })}
          />
        </label>
        <label>
          E-mail
          <input
            type="text"
            name="email" value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </label>
        <label>
          Telefon
          <input
            type="text"
            name="phone" value={draft.phone}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </label>
        <label>
          Stav
          <select
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as CrewEntry["status"] })}
          >
            {Object.entries(crewStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Termín
          <input
            type="text"
            name="term" maxLength={1000} required={draft.status === "confirmed"} value={draft.term}
            onChange={(e) => patch({ term: e.target.value })}
          />
        </label>
        <label>
          Pátek
          <input
            type="text"
            name="friday" maxLength={100} value={draft.friday}
            onChange={(e) => patch({ friday: e.target.value })}
          />
        </label>
        <label>
          Sobota
          <input
            type="text"
            name="saturday" maxLength={100} value={draft.saturday}
            onChange={(e) => patch({ saturday: e.target.value })}
          />
        </label>
        <label>
          Poznámka pro crew
          <textarea
            name="notes" value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.archived}
            onChange={(e) => patch({ archived: e.target.checked })}
          />
          Vyřazen z crew
        </label>
        {isAdmin && (
          <label>
            Přiřazený účet
            <select
              value={draft.linked_user_id ?? ""}
              onChange={(e) => patch({ linked_user_id: e.target.value || null })}
            >
              <option value="">Žádný</option>
              {hiddenLink && (
                <option value={draft.linked_user_id ?? ""}>Přiřazený účet</option>
              )}
              {accountOptions.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.email ?? "Bez e-mailu"}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      {!readOnly && (
        <div>
          <button type="submit" disabled={disabled}>
            Uložit
          </button>
          <button type="button" onClick={onCancel} disabled={disabled}>
            Zrušit
          </button>
        </div>
      )}
    </form>
  );
}

export function CrewCategoryForm(props: {
  category?: CrewCategory;
  onSave: SaveCrew;
  onDirty: () => void;
  disabled: boolean;
}) {
  const { category, onSave, onDirty, disabled } = props;
  const idRef = useRef(category?.id ?? newId());
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "cat-0");
  const [requiredCount, setRequiredCount] = useState(
    category?.required_count === null || category?.required_count === undefined
      ? ""
      : String(category.required_count),
  );
  const [requiredTerm, setRequiredTerm] = useState(category?.required_term ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function markDirty() {
    onDirty();
  }

  function parseRequiredCount(): number | null {
    if (!requiredCount.trim()) return null;
    const value = Number(requiredCount);
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new Error("INVALID_COUNT");
    }
    return value;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    let count: number | null;
    try {
      count = parseRequiredCount();
    } catch {
      setError("Počet musí být celé číslo 0 až 10000, nebo prázdné.");
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave("category", {
        id: idRef.current,
        version: category?.version ?? 0,
        name,
        color,
        required_count: count,
        required_term: requiredTerm,
      });
      if (!ok) setError(SAVE_FAILED);
    } catch (err) {
      setError(crewMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="crew-form-grid" disabled={disabled || saving}>
        <label>
          Název
          <input
            type="text"
            name="name" required maxLength={100} value={name}
            onChange={(e) => {
              setName(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Barva
          <select name="color" value={color} onChange={(e) => { setColor(e.target.value); markDirty(); }}>
            {["Modrá", "Fialová", "Tyrkysová", "Oranžová", "Růžová", "Zelená", "Indigová", "Hnědá", "Olivová", "Azurová", "Vínová", "Šedá"].map((label,index) => <option key={index} value={`cat-${index}`}>{label}</option>)}
          </select>
        </label>
        <label>
          Potřebný počet
          <input
            type="text"
            placeholder="neurčeno"
            name="required_count" inputMode="numeric" value={requiredCount}
            onChange={(e) => {
              setRequiredCount(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Přesný termín cíle
          <input
            type="text"
            name="required_term" maxLength={1000} value={requiredTerm}
            onChange={(e) => {
              setRequiredTerm(e.target.value);
              markDirty();
            }}
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={disabled || saving}>
        Uložit kategorii
      </button>
    </form>
  );
}

export function CrewCompensationForm(props: {
  entryId: string;
  fee?: CrewCompensation;
  onSave: SaveCrew;
  onDirty: () => void;
  disabled: boolean;
}) {
  const { entryId, fee, onSave, onDirty, disabled } = props;
  const [estimate, setEstimate] = useState(crewMoneyInput(fee?.estimate ?? null));
  const [agreed, setAgreed] = useState(crewMoneyInput(fee?.agreed ?? null));
  const [total, setTotal] = useState(crewMoneyInput(fee?.total ?? null));
  const [paid, setPaid] = useState(crewMoneyInput(fee?.paid ?? null));
  const [barter, setBarter] = useState(fee?.barter ?? "");
  const [merch, setMerch] = useState(fee?.merch ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function markDirty() {
    onDirty();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    let payload: Record<string, unknown>;
    try {
      payload = {
        id: entryId,
        version: fee?.version ?? 0,
        estimate: nullableCrewMoney(estimate),
        agreed: nullableCrewMoney(agreed),
        total: nullableCrewMoney(total),
        paid: nullableCrewMoney(paid),
        barter,
        merch,
      };
    } catch {
      setError(MONEY_ERROR);
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave("compensation", payload);
      if (!ok) setError(SAVE_FAILED);
    } catch (err) {
      setError(crewMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="crew-form-grid" disabled={disabled || saving}>
        <label>
          Odhad (Kč)
          <input
            type="text"
            name="estimate" value={estimate}
            onChange={(e) => {
              setEstimate(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Domluva (Kč)
          <input
            type="text"
            name="agreed" value={agreed}
            onChange={(e) => {
              setAgreed(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Celková hodnota (Kč)
          <input
            type="text"
            name="total" value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Vyplaceno (Kč)
          <input
            type="text"
            name="paid" value={paid}
            onChange={(e) => {
              setPaid(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Barter
          <input
            type="text"
            name="barter" value={barter}
            onChange={(e) => {
              setBarter(e.target.value);
              markDirty();
            }}
          />
        </label>
        <label>
          Merch
          <input
            type="text"
            name="merch" value={merch}
            onChange={(e) => {
              setMerch(e.target.value);
              markDirty();
            }}
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={disabled || saving}>
        Uložit odměnu
      </button>
    </form>
  );
}

export function CrewMembershipForm(props: {
  member?: CrewMembership;
  onSave: SaveCrew;
  onDirty: () => void;
  disabled: boolean;
}) {
  const { member, onSave, onDirty, disabled } = props;
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<CrewRole>(member?.role ?? "member");
  const [enabled, setEnabled] = useState(member?.enabled ?? true);
  const [canFinance, setCanFinance] = useState(member?.can_finance ?? false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function markDirty() {
    onDirty();
  }

  function changeRole(nextRole: CrewRole) {
    setRole(nextRole);
    if (nextRole === "member") setCanFinance(false);
    markDirty();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const financeValue = role === "member" ? false : canFinance;
    const payload: Record<string, unknown> = member
      ? {
          user_id: member.user_id,
          version: member.version,
          role,
          enabled,
          can_finance: financeValue,
        }
      : {
          email,
          role,
          enabled,
          can_finance: financeValue,
          version: 0,
        };
    setSaving(true);
    try {
      const ok = await onSave("member", payload);
      if (!ok) setError(SAVE_FAILED);
    } catch (err) {
      setError(crewMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="crew-form-grid" disabled={disabled || saving}>
        {member ? (
          <p>Účet: {member.email ?? "neznámý e-mail"}</p>
        ) : (
          <>
            <label>
              E-mail existujícího účtu
              <input
                type="email" name="email" required maxLength={500}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  markDirty();
                }}
              />
            </label>
            <p>Účet musí už existovat, pozvánka se neodesílá automaticky.</p>
          </>
        )}
        <label>
          Role
          <select
            value={role}
            onChange={(e) => changeRole(e.target.value as CrewRole)}
          >
            {crewRoles.map((r) => (
              <option key={r} value={r}>
                {crewRoleLabels[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              markDirty();
            }}
          />
          Zapnuto
        </label>
        {role === "admin" ? (
          <p>
            Správce má přístup k odměnám automaticky.
          </p>
        ) : (
          <label>
            <input
              type="checkbox"
              name="can_finance" checked={canFinance}
              disabled={role === "member"}
              onChange={(e) => {
                setCanFinance(e.target.checked);
                markDirty();
              }}
            />
            Přístup k financím
          </label>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={disabled || saving}>
        Uložit členství
      </button>
    </form>
  );
}
