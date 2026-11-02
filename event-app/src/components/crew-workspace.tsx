"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CrewRosterView } from "./crew-roster-view";
import { OperationsPanel } from "./operations-panel";
import { CrewCategoryForm, CrewMembershipForm } from "./crew-forms";
import { Edition } from "../lib/model";
import {
  CrewData,
  CrewEntry,
  CrewWriteKind,
  crewMessage,
  crewRequestFingerprint,
  crewStatuses,
  emptyCrewEntry,
} from "../lib/crew-model";
import { loadCrew, loadCrewEditions, writeCrew } from "../lib/crew-backend";

type CrewWorkspaceProps = {
  userId: string;
  userEmail?: string;
  onLogout: () => Promise<void>;
};

type SettingsTarget = { kind: "category" | "member"; id: string | null };
type Filters = { search: string; status: string; includeArchived: boolean };

export function CrewWorkspace({ userId, userEmail, onLogout }: CrewWorkspaceProps) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [data, setData] = useState<CrewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    includeArchived: false,
  });
  const [expanded, setExpanded] = useState<string[]>([]);
  const [draft, setDraft] = useState<CrewEntry | null>(null);
  const [anchorCategoryId, setAnchorCategoryId] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<CrewWriteKind | null>(null);
  const [settings, setSettings] = useState<SettingsTarget | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);

  const [workspaceView, setWorkspaceView] = useState<"crew" | "operations" | null>(null);
  const operationsGuardRef = useRef<() => boolean>(() => true);
  const registerOperationsGuard = useCallback((guard: () => boolean) => { operationsGuardRef.current = guard; }, []);

  const liveRef = useRef(true);
  const generationRef = useRef(0);
  const writeLockRef = useRef(false);
  const operationRef = useRef(0);
  const pendingKindRef = useRef<CrewWriteKind | null>(null);
  const requestIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
      generationRef.current += 1;
      operationRef.current += 1;
      writeLockRef.current = false;
      requestIdsRef.current.clear();
    };
  }, []);

  const loadEditionsList = useCallback(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setLoading(true);
    setError(null);
    loadCrewEditions()
      .then((eds) => {
        if (!liveRef.current || generation !== generationRef.current) return;
        setEditions(eds);
        const active = eds.find((ed) => !ed.archived);
        const chosen = active ?? eds[0] ?? null;
        if (chosen) {
          setEditionId(chosen.id);
        } else {
          setEditionId(null);
          setData(null);
          setLoading(false);
          setError("Nenašel se žádný ročník, do kterého máš přístup ke crew.");
        }
      })
      .catch((e) => {
        if (!liveRef.current || generation !== generationRef.current) return;
        setLoading(false);
        setError(crewMessage(e));
      });
  }, []);

  const refreshCrew = useCallback((id: string) => {
    generationRef.current += 1;
    const generation = generationRef.current;
    setData(null);
    setLoading(true);
    setError(null);
    loadCrew(id)
      .then((result) => {
        if (!liveRef.current || generation !== generationRef.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (!liveRef.current || generation !== generationRef.current) return;
        setLoading(false);
        setError(crewMessage(e));
      });
  }, []);

  useEffect(() => {
    loadEditionsList();
  }, [loadEditionsList]);

  useEffect(() => {
    if (editionId) refreshCrew(editionId);
  }, [editionId, refreshCrew]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (pendingKindRef.current || writeLockRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingKind]);

  const edition = editions.find((e) => e.id === editionId) ?? null;
  const role = data?.role ?? null;
  const canEditActive = (role === "admin" || role === "coordinator") && Boolean(edition) && !edition?.archived;
  const canEditMembers = role === "admin";
  const selectedCategory =
    settings?.kind === "category" && settings.id
      ? data?.categories.find((c) => c.id === settings.id)
      : undefined;
  const selectedMember =
    settings?.kind === "member" && settings.id
      ? data?.members.find((m) => m.user_id === settings.id)
      : undefined;

  useEffect(() => {
    if (!settings) return;
    if (settings.kind === "category" && !canEditActive) setSettings(null);
    if (settings.kind === "member" && !canEditMembers) setSettings(null);
  }, [settings, canEditActive, canEditMembers]);

  function clearPending() { pendingKindRef.current = null; setPendingKind(null); }
  function accessDenied(value: unknown): boolean {
    const message = (value as {message?: unknown})?.message;
    return typeof message === "string" && message.includes("CREW_ACCESS_DENIED");
  }
  function clearProtected() {
    setData(null); setDraft(null); setAnchorCategoryId(null); setSettings(null);
    clearPending(); requestIdsRef.current.clear(); setNotice(null);
    setFormEpoch(value => value + 1);
  }

  function requestLeave(): boolean {
    if (writeLockRef.current) return false;
    if (!operationsGuardRef.current()) return false;
    if (pendingKindRef.current) {
      const ok = window.confirm(
        "Zahodit rozepsané údaje? Už uložené změny zůstanou zachované.",
      );
      if (!ok) return false;
    }
    setDraft(null);
    setAnchorCategoryId(null);
    clearPending();
    setSettings(null);
    setFormEpoch((e) => e + 1);
    requestIdsRef.current.clear();
    setNotice(null);
    return true;
  }

  function handleRouteExit(event: import("react").MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!requestLeave()) event.preventDefault();
  }

  function retry() {
    if (!requestLeave()) return;
    if (editionId) refreshCrew(editionId);
    else loadEditionsList();
  }

  function handleEditionChange(id: string) {
    if (!requestLeave()) return;
    generationRef.current += 1;
    setData(null); setLoading(true); setExpanded([]); setError(null); setNotice(null);
    setEditionId(id);
  }

  function updateFilters(next: Partial<Filters>) {
    if (!requestLeave()) return;
    setFilters((prev) => ({ ...prev, ...next }));
  }

  function handleToggle(categoryId: string) {
    const collapsingAnchor = categoryId === anchorCategoryId && expanded.includes(categoryId);
    if (collapsingAnchor && !requestLeave()) return;
    setExpanded((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  }

  function handleOpen(entryId: string) {
    if (!requestLeave()) return;
    const entry = data?.entries.find((e) => e.id === entryId);
    if (!entry) return;
    setDraft({ ...entry });
    setAnchorCategoryId(entry.category_id);
    setExpanded((prev) => (prev.includes(entry.category_id) ? prev : [...prev, entry.category_id]));
  }

  function handleChange(next: CrewEntry) {
    if (!markDirty("roster")) return;
    setDraft(next);
  }

  function closeDetail() {
    if (!requestLeave()) return;
  }

  function handleNewEntry() {
    const previousAnchor = anchorCategoryId;
    if (!requestLeave()) return;
    if (!edition || edition.archived || !canEditActive) return;
    const categoryId = previousAnchor ?? data?.categories[0]?.id ?? null;
    if (!categoryId) {
      setError("Nejprve vytvoř kategorii.");
      return;
    }
    const entry = emptyCrewEntry(categoryId);
    entry.id = crypto.randomUUID();
    entry.edition_id = edition.id;
    setDraft(entry);
    setAnchorCategoryId(categoryId);
    setExpanded((prev) => (prev.includes(categoryId) ? prev : [...prev, categoryId]));
  }

  function openSettings(target: SettingsTarget) {
    if (!requestLeave()) return;
    setSettings(target);
  }

  function closeSettings() {
    if (!requestLeave()) return;
  }

  function markDirty(kind: CrewWriteKind): boolean {
    if (writeLockRef.current) return false;
    if (pendingKindRef.current && pendingKindRef.current !== kind) {
      setError("Nejprve ulož nebo zahoď rozepsanou část."); return false;
    }
    pendingKindRef.current = kind; setPendingKind(kind); setNotice(null); return true;
  }

  async function handleLogout() {
    if (!requestLeave()) return;
    if (writeLockRef.current) return;
    writeLockRef.current = true;
    const operation = ++operationRef.current;
    setSaving(true);
    try {
      await onLogout();
    } catch {
      if (liveRef.current) setError("Odhlášení se nezdařilo.");
    } finally {
      if (operationRef.current === operation) {
        writeLockRef.current = false;
        if (liveRef.current) setSaving(false);
      }
    }
  }

  function canWrite(kind: CrewWriteKind): boolean {
    if (!data || !edition) return false;
    if (kind === "member") return data.role === "admin";
    const activeRole = data.role === "admin" || data.role === "coordinator";
    if (kind === "compensation") return activeRole && !edition.archived && data.canFinance;
    return activeRole && !edition.archived;
  }

  async function save(kind: CrewWriteKind, payload: Record<string, unknown>): Promise<boolean> {
    if (pendingKindRef.current && pendingKindRef.current !== kind) {
      setError("Nejprve ulož nebo zahoď rozpracovanou změnu v jiném formuláři.");
      return false;
    }
    if (!edition || !data) return false;
    if (!canWrite(kind)) {
      setError(crewMessage(Error("CREW_ACCESS_DENIED")));
      return false;
    }
    if (writeLockRef.current) return false;
    writeLockRef.current = true;
    setSaving(true);
    const operation = ++operationRef.current;
    const generation = generationRef.current;
    setError(null); setNotice(null);
    try {
      const fingerprint = crewRequestFingerprint(edition.id, kind, payload);
      let requestId = requestIdsRef.current.get(fingerprint);
      if (!requestId) { requestId = crypto.randomUUID(); requestIdsRef.current.set(fingerprint, requestId); }
      const result = await writeCrew(edition.id, kind, payload, requestId);
      if (generation !== generationRef.current || !liveRef.current) return false;
      let refreshed: CrewData;
      try {
        refreshed = await loadCrew(edition.id);
      } catch (refreshError) {
        if (generation !== generationRef.current || !liveRef.current) return false;
        if (accessDenied(refreshError)) clearProtected();
        setError(accessDenied(refreshError)
          ? "Změna byla potvrzena. Přístup k těmto údajům už není dostupný."
          : "Změna byla potvrzena, ale aktuální údaje se nepodařilo načíst. Můžeš zopakovat Uložit, nebo vědomě zahodit rozepsání a obnovit přehled.");
        return false;
      }
      if (generation !== generationRef.current || !liveRef.current) return false;
      requestIdsRef.current.delete(fingerprint);
      setData(refreshed);
      setError(null);
      setNotice("Uloženo.");
      if (kind === "roster" || kind === "compensation") {
        const savedId = payload.id as string;
        const savedEntry = refreshed.entries.find((e) => e.id === savedId);
        if (savedEntry) {
          setDraft({ ...savedEntry });
          setAnchorCategoryId(savedEntry.category_id);
          setExpanded((prev) =>
            prev.includes(savedEntry.category_id) ? prev : [...prev, savedEntry.category_id],
          );
        }
        clearPending();
      } else {
        const r = result as { id?: string; user_id?: string } | null;
        const savedId = kind === "member" ? r?.user_id ?? (payload.user_id as string) : r?.id ?? (payload.id as string);
        setSettings((prev) => (prev ? { ...prev, id: savedId ?? null } : prev));
        clearPending();
        setFormEpoch((e) => e + 1);
      }
      return true;
    } catch (e) {
      if (generation !== generationRef.current || !liveRef.current) return false;
      if (accessDenied(e)) clearProtected();
      setError(crewMessage(e));
      return false;
    } finally {
      if (operationRef.current === operation) {
        writeLockRef.current = false;
        if (liveRef.current) setSaving(false);
      }
    }
  }

  const showCrew = (workspaceView ?? (role === "member" ? "operations" : "crew")) === "crew";
  function switchWorkspace(next: "crew" | "operations") {
    if (!requestLeave()) return;
    setWorkspaceView(next);
  }

  const categoryKey = `category:${settings?.id ?? "new"}:${selectedCategory?.version ?? 0}:${formEpoch}`;
  const memberKey = `member:${settings?.id ?? "new"}:${selectedMember?.version ?? 0}:${formEpoch}`;

  return (
    <div className="app-shell crew-app">
      <a className="skip crew-skip-link" href="#content">
        Přeskočit na obsah
      </a>
      <aside className="sidebar crew-sidebar">
        <div className="wordmark crew-wordmark">SVDT<span>ORGANIZACE</span></div>
        <nav>
          <button type="button" className={`nav ${showCrew ? "active crew-nav-active" : ""}`} aria-pressed={showCrew} onClick={() => switchWorkspace("crew")} disabled={saving}>Lidi a crew</button>
          <button type="button" className={`nav ${!showCrew ? "active crew-nav-active" : ""}`} aria-pressed={!showCrew} onClick={() => switchWorkspace("operations")} disabled={saving}>Provoz závodu</button>
          {role !== "member" && <a className="nav" href="/" onClick={handleRouteExit}>Partneři</a>}
        </nav>
        <div className="side-bottom crew-account">
          <span>Přihlášen jako {userEmail || "přihlášený účet"}</span>
          <button type="button" onClick={handleLogout} disabled={saving}>
            Odhlásit se
          </button>
        </div>
      </aside>
      <main id="content" className="workspace crew-content">
        <div className="topbar crew-topbar">
          <label>
            Ročník
            <select disabled={saving} value={editionId ?? ""} onChange={(e) => handleEditionChange(e.target.value)}>
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.year}
                </option>
              ))}
            </select>
          </label>
          {edition?.archived && (
            <p className="crew-archive-notice">Tento ročník je archivovaný, data jsou jen pro čtení.</p>
          )}
          <p className="crew-local-notice">
            Sdílená evidence. Současná místní data se sem nepřenášejí automaticky; změny od ostatních načteš tlačítkem Obnovit.
          </p>
          <button type="button" onClick={retry} disabled={saving}>Obnovit</button>
        </div>
        {showCrew && <div className="section-heading compact"><h1>Lidi a crew</h1></div>}
        {pendingKind && <p className="muted">Nejdřív ulož nebo zahoď rozepsanou část.</p>}

        {loading && <p role="status">Načítání…</p>}
        {error && (
          <p role="alert" className="crew-error">
            {error}{" "}
            <button type="button" onClick={retry} disabled={saving}>
              {pendingKind ? "Zahodit změny a načíst znovu" : "Načíst znovu"}
            </button>
          </p>
        )}
        {notice && <p role="status" className="crew-notice">{notice}</p>}

        {showCrew && <>
        <div className="filters crew-filters">
          <input
            type="search" aria-label="Hledat v crew" disabled={saving}
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Hledat…"
          />
          <select aria-label="Stav účasti" disabled={saving} value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}>
            <option value="all">Všechny stavy</option>
            {Object.entries(crewStatuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox" disabled={saving}
              checked={filters.includeArchived}
              onChange={(e) => updateFilters({ includeArchived: e.target.checked })}
            />
            Zahrnout archivované
          </label>
          <button type="button" onClick={handleNewEntry} disabled={saving || !canEditActive}>
            Nová osoba
          </button>
          <button
            type="button"
            onClick={() => openSettings({ kind: "category", id: null })}
            disabled={saving || !canEditActive}
          >
            Nová kategorie
          </button>
          <button
            type="button"
            onClick={() => openSettings({ kind: "member", id: null })}
            disabled={saving || !canEditMembers}
          >
            Správa přístupů
          </button>
        </div>

        {edition && data && (
          <CrewRosterView
            edition={edition}
            data={data}
            userId={userId}
            filters={filters}
            expanded={expanded}
            draft={draft}
            anchorCategoryId={anchorCategoryId}
            pendingKind={pendingKind}
            saving={saving}
            onToggle={handleToggle}
            onOpen={handleOpen}
            onChange={handleChange}
            onCancel={closeDetail}
            onSave={save}
            onDirty={markDirty}
          />
        )}

        {settings && (
          <section className="crew-settings" aria-label="Nastavení">
            <div className="crew-settings-header">
              <h2>{settings.kind === "category" ? "Kategorie" : "Přístup člena"}</h2>
              <button type="button" onClick={closeSettings}>
                Zavřít
              </button>
            </div>
            {settings.kind === "category" && canEditActive && (
              <>
                <label>
                  Kategorie
                  <select
                    value={settings.id ?? ""} disabled={saving}
                    onChange={(e) => openSettings({ kind: "category", id: e.target.value || null })}
                  >
                    <option value="">Nová kategorie</option>
                    {data?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <CrewCategoryForm
                  key={categoryKey}
                  category={selectedCategory}
                  onSave={save}
                  onDirty={() => markDirty("category")}
                  disabled={saving || Boolean(edition?.archived) || (pendingKind !== null && pendingKind !== "category")}
                />
              </>
            )}
            {settings.kind === "member" && canEditMembers && (
              <>
                <label>
                  Člen
                  <select
                    value={settings.id ?? ""} disabled={saving}
                    onChange={(e) => openSettings({ kind: "member", id: e.target.value || null })}
                  >
                    <option value="">Nový člen</option>
                    {data?.members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.email || "Účet bez e-mailu"} · {{admin:"Správce",coordinator:"Koordinátor",member:"Člen"}[m.role]}{m.enabled ? "" : " · vypnuto"}
                      </option>
                    ))}
                  </select>
                </label>
                <CrewMembershipForm
                  key={memberKey}
                  member={selectedMember}
                  onSave={save}
                  onDirty={() => markDirty("member")}
                  disabled={saving || (pendingKind !== null && pendingKind !== "member")}
                />
              </>
            )}
          </section>
        )}
        </>}
        {!showCrew && edition && data && <OperationsPanel key={`${userId}:${edition.id}`} edition={edition} crew={data} userId={userId} onGuardChange={registerOperationsGuard} />}
      </main>
    </div>
  );
}
