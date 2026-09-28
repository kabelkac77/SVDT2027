"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Data,
  Deliverable,
  DeliverableInput,
  Edition,
  fulfillmentStatuses,
  PartnerInput,
  Prospect,
  dateLabel,
  emptyPartner,
  message,
  normalized,
  partnerInput,
  statuses,
  todayPrague,
  isHttpUrl,
} from "@/lib/model";
import {
  loadData,
  saveDeliverable,
  savePartner,
  supabase,
} from "@/lib/backend";
import {
  demoUser,
  readDemo,
  resetDemo,
  writeDemoDeliverable,
  writeDemoPartner,
} from "@/lib/demo";
import { Intake } from "./intake";
import { Finance } from "./finance";
import { SocialLogin } from "./social-login";
import { financeKey } from "@/lib/finance";

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${value === "potvrzen" || value === "splněno" ? "positive" : value === "zamítnut" ? "negative" : ""}`}
    >
      {value}
    </span>
  );
}
function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required = false,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label>
      {label}
      {required ? " *" : ""}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
}

export function PartnersApp({ demo = false }: { demo?: boolean }) {
  const [user, setUser] = useState<string | null>(demo ? demoUser : null);
  const [checking, setChecking] = useState(!demo);
  const [data, setData] = useState<Data | null>(null);
  const [editionId, setEditionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [financeOrganization, setFinanceOrganization] = useState("");
  const [draft, setDraft] = useState<PartnerInput | null>(null);
  const [view, setView] = useState<"partners" | "intake" | "finance">(
    "partners",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [due, setDue] = useState("all");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const d = demo ? readDemo() : await loadData();
      if (ticket !== generation.current) return;
      setData(d);
      setEditionId((id) =>
        d.editions.some((e) => e.id === id)
          ? id
          : d.editions.toSorted((a, b) => b.year - a.year)[0]?.id || "",
      );
    } catch (e) {
      if (ticket === generation.current) setError(message(e));
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    if (demo) return;
    const callback = new URL(window.location.href);
    const fragment = new URLSearchParams(callback.hash.slice(1));
    if (callback.searchParams.has("error") || fragment.has("error")) {
      setError(
        "Přihlášení nebylo dokončeno. Zkus to znovu nebo použij jiný způsob přihlášení.",
      );
      for (const key of ["error", "error_code", "error_description"]) {
        callback.searchParams.delete(key);
        fragment.delete(key);
      }
      callback.hash = fragment.toString();
      window.history.replaceState(
        null,
        "",
        callback.pathname + callback.search + callback.hash,
      );
    }
    const db = supabase();
    if (!db) {
      setChecking(false);
      return;
    }
    let alive = true;
    db.auth.getUser().then(({ data, error }) => {
      if (alive) {
        setUser(data.user?.id || null);
        setChecking(false);
        if (error && error.name !== "AuthSessionMissingError")
          setError("Přihlášení se nepodařilo ověřit. Přihlas se znovu.");
      }
    });
    const { data: subscription } = db.auth.onAuthStateChange(
      (_event, session) => {
        if (alive) {
          setUser(session?.user.id || null);
          if (!session) {
            generation.current++;
            setData(null);
            setDraft(null);
            setSelected(null);
          }
        }
      },
    );
    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [demo]);
  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);
  const edition = data?.editions.find((e) => e.id === editionId);
  const member = data?.members.find(
    (m) => m.edition_id === editionId && m.user_id === user,
  );
  const canEdit = !!member && member.role !== "viewer" && !edition?.archived;
  const prospects =
    data?.prospects.filter((p) => p.edition_id === editionId) || [];
  const p = prospects.find((p) => p.id === selected);
  const records = prospects
    .filter((p) => {
      const o = data!.organizations.find((o) => o.id === p.organization_id);
      const c = data!.people.find((c) => c.id === o?.primary_contact_id);
      return (
        normalized(
          [o?.name, o?.registration_id, c?.name, c?.email].join(" "),
        ).includes(normalized(search)) &&
        (status === "all" || p.status === status) &&
        (owner === "all" || p.owner_id === owner) &&
        (due === "all" ||
          (p.status !== "zamítnut" &&
            p.next_contact_on &&
            (due === "today"
              ? p.next_contact_on === todayPrague()
              : p.next_contact_on < todayPrague())))
      );
    })
    .sort((a, b) =>
      data!.organizations
        .find((o) => o.id === a.organization_id)!
        .name.localeCompare(
          data!.organizations.find((o) => o.id === b.organization_id)!.name,
          "cs",
        ),
    );
  async function logout() {
    const { error } = await supabase()!.auth.signOut();
    if (error) setError(message(error));
  }
  async function savedPartner(input: PartnerInput) {
    const id = demo
      ? writeDemoPartner(editionId, input)
      : await savePartner(editionId, input);
    setDraft(null);
    setSelected(id);
    setNotice("Partner byl uložen.");
    await refresh();
  }
  async function savedDeliverable(input: DeliverableInput) {
    if (demo) writeDemoDeliverable(editionId, input);
    else await saveDeliverable(editionId, input);
    setNotice("Plnění bylo uloženo.");
    await refresh();
  }
  function changeEdition(id: string) {
    setEditionId(id);
    setSelected(null);
    setDraft(null);
    setNotice("");
    setSearch("");
    setStatus("all");
    setOwner("all");
    setDue("all");
    setView("partners");
  }
  if (checking)
    return (
      <main className="auth">
        <p role="status">Ověřuji přihlášení…</p>
      </main>
    );
  if (!user) return <Login error={error} />;
  return (
    <div className="app-shell">
      <a className="skip" href="#content">
        Přejít na obsah
      </a>
      <aside className="sidebar">
        <a className="wordmark" href={demo ? "/demo" : "/"}>
          SVDT<span>ORGANIZACE</span>
        </a>
        <div className="side-label">Pracovní prostor</div>
        <button
          className={view === "partners" ? "nav active" : "nav"}
          onClick={() => {
            setView("partners");
            setDraft(null);
            setSelected(null);
          }}
        >
          Partneři <span>↗</span>
        </button>
        {demo && (
          <button
            className={view === "finance" ? "nav active" : "nav"}
            onClick={() => {
              setFinanceOrganization("");
              setView("finance");
              setDraft(null);
              setSelected(null);
            }}
          >
            Finance <span>↗</span>
          </button>
        )}
        {!demo && (
          <button
            className={view === "intake" ? "nav active" : "nav"}
            onClick={() => {
              setView("intake");
              setDraft(null);
              setSelected(null);
            }}
          >
            Podklady k importu
          </button>
        )}
        <div className="side-bottom">
          <span className="small">
            {demo
              ? "Ukázkový prostor"
              : member?.display_name || "Přihlášený uživatel"}
          </span>
          <span className="muted small">
            {demo
              ? "Fiktivní data"
              : member?.role === "viewer"
                ? "Pouze čtení"
                : "Interní management"}
          </span>
          {!demo && (
            <button className="quiet" onClick={() => void logout()}>
              Odhlásit se
            </button>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="muted small">Svatohorský Downtown Příbram</span>
          <label className="edition-select">
            Ročník
            <select
              aria-label="Ročník"
              disabled={!!draft}
              value={editionId}
              onChange={(e) => changeEdition(e.target.value)}
            >
              {data?.editions
                .toSorted((a, b) => b.year - a.year)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.archived ? " · archiv" : ""}
                  </option>
                ))}
            </select>
          </label>
        </header>
        <main id="content">
          <div className="banners">
            {demo && (
              <div className="notice demo">
                DEMO · Změny se ukládají jen v tomto prohlížeči.{" "}
                <button
                  className="quiet"
                  onClick={() => {
                    resetDemo();
                    localStorage.removeItem(financeKey);
                    setView("partners");
                    setDraft(null);
                    setSelected(null);
                    void refresh();
                  }}
                >
                  Obnovit demo
                </button>
                <a href="/">Skutečná evidence ↗</a>
              </div>
            )}
            {edition?.archived && (
              <div className="notice">Archivovaný ročník · pouze ke čtení.</div>
            )}
            {error && (
              <div className="error" role="alert">
                {error}{" "}
                <button onClick={() => void refresh()}>Zkusit znovu</button>
              </div>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            {loading && (
              <p role="status" className="muted small">
                Načítám aktuální data…
              </p>
            )}
          </div>
          {data &&
            (!edition ? (
              <div className="empty">
                <h1>Zatím nemáš přístup k ročníku.</h1>
                <p>
                  Správce ti musí přidělit členství. Přihlášení samo o sobě
                  přístup k partnerům nedává.
                </p>
              </div>
            ) : view === "finance" && demo ? (
              <Finance
                key={editionId}
                data={data}
                editionId={editionId}
                organizationId={financeOrganization}
                onPartner={(id) => {
                  setSelected(id);
                  setView("partners");
                }}
              />
            ) : draft ? (
              <PartnerForm
                key={draft.id || draft.organization_id || draft.name || "new"}
                initial={draft}
                data={data}
                edition={edition}
                onSave={savedPartner}
                onCancel={() => setDraft(null)}
                onReload={async () => {
                  setDraft(null);
                  await refresh();
                }}
              />
            ) : view === "intake" ? (
              <Intake
                year={edition.year}
                onChoose={
                  canEdit
                    ? (input) => {
                        setDraft(input);
                        setView("partners");
                      }
                    : undefined
                }
              />
            ) : p ? (
              <>
                {demo && (
                  <button
                    onClick={() => {
                      setFinanceOrganization(p.organization_id);
                      setView("finance");
                    }}
                  >
                    Finance tohoto partnera
                  </button>
                )}
                <PartnerDetail
                  key={p.id}
                  data={data}
                  prospect={p}
                  canEdit={canEdit}
                  onBack={() => setSelected(null)}
                  onEdit={() => setDraft(partnerInput(data, p))}
                  onSave={savedDeliverable}
                  onReload={refresh}
                />
              </>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      Vztahy a spolupráce / {edition.year}
                    </p>
                    <h1>Partneři</h1>
                    <p className="muted">
                      Od prvního oslovení po splněné závazky.
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      className="primary"
                      onClick={() => {
                        setNotice("");
                        setDraft(emptyPartner());
                      }}
                    >
                      + Přidat partnera
                    </button>
                  )}
                </div>
                <div className="stats">
                  {[
                    { label: "Celkem partnerů", value: "all" },
                    ...statuses.map((s) => ({
                      label:
                        s === "osloven"
                          ? "Oslovení"
                          : s === "potvrzen"
                            ? "Potvrzení"
                            : "Zamítnutí",
                      value: s,
                    })),
                  ].map((s) => (
                    <button
                      className={status === s.value ? "stat selected" : "stat"}
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                    >
                      <span>{s.label}</span>
                      <strong>
                        {s.value === "all"
                          ? prospects.length
                          : prospects
                              .filter((p) => p.status === s.value)
                              .length.toString()
                              .padStart(2, "0")}
                      </strong>
                      <small>
                        {s.value === "potvrzen"
                          ? "Aktivní spolupráce"
                          : s.value === "osloven"
                            ? "Čekáme na domluvu"
                            : s.value === "zamítnut"
                              ? "Historie zůstává"
                              : "V tomto ročníku"}
                      </small>
                    </button>
                  ))}
                </div>
                <section className="list-panel">
                  <div className="filters">
                    <label className="search">
                      Hledat partnera
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Název, IČO nebo kontakt…"
                      />
                    </label>
                    <label>
                      Stav
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="all">Všechny stavy</option>
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Owner
                      <select
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                      >
                        <option value="all">Všichni owneři</option>
                        {data.members
                          .filter((m) => m.edition_id === editionId)
                          .map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.display_name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Další kontakt
                      <select
                        value={due}
                        onChange={(e) => setDue(e.target.value)}
                      >
                        <option value="all">Všechny termíny</option>
                        <option value="overdue">Po termínu</option>
                        <option value="today">Dnes</option>
                      </select>
                    </label>
                  </div>
                  {records.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Organizace / kontakt</th>
                            <th>Stav spolupráce</th>
                            <th>Owner</th>
                            <th>Další kontakt</th>
                            <th>Plnění</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((p) => {
                            const o = data.organizations.find(
                              (o) => o.id === p.organization_id,
                            )!;
                            const c = data.people.find(
                              (c) => c.id === o.primary_contact_id,
                            );
                            const s = data.partnerships.find(
                              (s) => s.prospect_id === p.id,
                            );
                            const ds = data.deliverables.filter(
                              (d) => d.partnership_id === s?.id,
                            );
                            return (
                              <tr key={p.id}>
                                <td>
                                  <button
                                    className="partner-link"
                                    onClick={() => {
                                      setSelected(p.id);
                                      setNotice("");
                                    }}
                                  >
                                    {o.name}
                                    <span>↗</span>
                                  </button>
                                  <small>
                                    {c?.name || "Kontakt zatím nedoplněn"}
                                  </small>
                                </td>
                                <td>
                                  <Badge value={p.status} />
                                </td>
                                <td>
                                  {
                                    data.members.find(
                                      (m) =>
                                        m.edition_id === editionId &&
                                        m.user_id === p.owner_id,
                                    )?.display_name
                                  }
                                </td>
                                <td
                                  className={
                                    p.status !== "zamítnut" &&
                                    p.next_contact_on &&
                                    p.next_contact_on < todayPrague()
                                      ? "overdue"
                                      : ""
                                  }
                                >
                                  {dateLabel(p.next_contact_on)}
                                </td>
                                <td>
                                  {s ? (
                                    <>
                                      <span className="numbers">
                                        {
                                          ds.filter(
                                            (d) => d.status === "splněno",
                                          ).length
                                        }{" "}
                                        / {ds.length}
                                      </span>
                                      <small>splněno</small>
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">
                      <h2>
                        {prospects.length
                          ? "Nic neodpovídá filtrům."
                          : "Tady začíná spolupráce."}
                      </h2>
                      <p>
                        {prospects.length
                          ? "Zkus jiný název nebo zruš filtry."
                          : "Přidej prvního partnera nebo použij zkontrolovaný podklad."}
                      </p>
                      {prospects.length ? (
                        <button
                          onClick={() => {
                            setSearch("");
                            setStatus("all");
                            setOwner("all");
                            setDue("all");
                          }}
                        >
                          Zrušit filtry
                        </button>
                      ) : (
                        canEdit && (
                          <button
                            className="primary"
                            onClick={() => setDraft(emptyPartner())}
                          >
                            Přidat partnera
                          </button>
                        )
                      )}
                    </div>
                  )}
                  <footer className="list-footer">
                    {records.length} z {prospects.length} záznamů{" "}
                    <span>
                      Organizace napříč ročníky · spolupráce pro {edition.year}
                    </span>
                  </footer>
                </section>
              </>
            ))}
        </main>
      </div>
    </div>
  );
}

function Login({ error: authError }: { error: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const db = supabase();
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const { error } = await db!.auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error)
        throw Error("Přihlášení se nepodařilo. Zkontroluj e-mail a heslo.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <a className="wordmark" href="/">
        SVDT<span>ORGANIZACE</span>
      </a>
      <p className="eyebrow">Interní management</p>
      <h1>
        Všechny spolupráce.
        <br />
        Na jednom místě.
      </h1>
      {db ? (
        <>
          <SocialLogin disabled={busy} />
          <form onSubmit={login}>
            <Field label="E-mail" name="email" type="email" required />
            <Field label="Heslo" name="password" type="password" required />
            {(error || authError) && (
              <p className="error" role="alert">
                {error || authError}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Přihlašuji…" : "Přihlásit se"}
            </button>
            <p className="muted">
              Přístup k jednotlivým částem aplikace přiděluje organizátor.
            </p>
          </form>
        </>
      ) : (
        <div className="panel">
          <h2>Databáze zatím není připojená.</h2>
          <p className="muted">
            Pro skutečnou evidenci je potřeba nastavit Supabase a přístupy týmu.
            UI si můžeš vyzkoušet na fiktivních datech.
          </p>
        </div>
      )}
      <div className="auth-links">
        <a href="/demo">Otevřít demo ↗</a>
        <a href="/podklady">Prohlédnout podklady ↗</a>
      </div>
    </main>
  );
}

function PartnerForm({
  initial,
  data,
  edition,
  onSave,
  onCancel,
  onReload,
}: {
  initial: PartnerInput;
  data: Data;
  edition: Edition;
  onSave: (p: PartnerInput) => Promise<void>;
  onCancel: () => void;
  onReload: () => Promise<void>;
}) {
  const [base, setBase] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...base,
        ...Object.fromEntries(f.entries()),
      } as PartnerInput);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function selectOrg(id: string) {
    if (!id) {
      setBase(initial);
      setFormKey((k) => k + 1);
      return;
    }
    const o = data.organizations.find((o) => o.id === id)!;
    const c = data.people.find((c) => c.id === o.primary_contact_id);
    setBase({
      ...initial,
      organization_id: o.id,
      organization_version: o.version,
      name: o.name,
      country_code: o.country_code,
      registration_id: o.registration_id || "",
      website: o.website,
      contact_name: c?.name || "",
      contact_email: c?.email || "",
      contact_phone: c?.phone || "",
    });
    setFormKey((k) => k + 1);
  }
  return (
    <section>
      <button className="back" onClick={onCancel} disabled={busy}>
        ← Zpět
      </button>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{edition.name}</p>
          <h1>{initial.id ? "Upravit partnera" : "Nový partner"}</h1>
        </div>
      </div>
      {!initial.id && (
        <label className="organization-select">
          Organizace napříč dostupnými ročníky
          <select
            value={base.organization_id || ""}
            onChange={(e) => selectOrg(e.target.value)}
            disabled={busy}
          >
            <option value="">Založit novou organizaci</option>
            {data.organizations
              .filter(
                (o) =>
                  !data.prospects.some(
                    (p) =>
                      p.edition_id === edition.id && p.organization_id === o.id,
                  ),
              )
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.registration_id ? ` · ${o.registration_id}` : ""}
                </option>
              ))}
          </select>
        </label>
      )}
      <form key={formKey} onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="form-columns">
            <section className="panel">
              <p className="eyebrow">01 / Společný profil</p>
              <h2>Organizace a kontakt</h2>
              <p className="muted small">
                Změny profilu uvidíš i v ostatních ročnících.
              </p>
              <Field
                label="Název organizace"
                name="name"
                defaultValue={base.name}
                required
                maxLength={200}
              />
              <div className="field-row">
                <Field
                  label="Země (kód)"
                  name="country_code"
                  defaultValue={base.country_code}
                  required
                  maxLength={2}
                />
                <Field
                  label="IČO / registrační číslo"
                  name="registration_id"
                  defaultValue={base.registration_id}
                  maxLength={40}
                />
              </div>
              <Field
                label="Web"
                name="website"
                type="url"
                defaultValue={base.website}
                maxLength={2000}
              />
              <hr />
              <Field
                label="Hlavní kontakt — jméno nebo kontaktní místo"
                name="contact_name"
                defaultValue={base.contact_name}
                maxLength={200}
              />
              <Field
                label="E-mail hlavního kontaktu"
                name="contact_email"
                type="email"
                defaultValue={base.contact_email}
                maxLength={320}
              />
              <Field
                label="Telefon"
                name="contact_phone"
                type="tel"
                defaultValue={base.contact_phone}
                maxLength={80}
              />
            </section>
            <section className="panel">
              <p className="eyebrow">02 / {edition.year}</p>
              <h2>Spolupráce v ročníku</h2>
              <label>
                Owner *
                <select name="owner_id" defaultValue={base.owner_id} required>
                  <option value="">Vyber ownera</option>
                  {data.members
                    .filter(
                      (m) => m.edition_id === edition.id && m.role !== "viewer",
                    )
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Stav spolupráce *
                <select name="status" defaultValue={base.status} required>
                  <option value="">Vyber stav pro {edition.year}</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <p className="muted small">
                Potvrzením se zpřístupní evidence plnění. Historické poznámky
                samy o sobě spolupráci nepotvrzují.
              </p>
              <Field
                label="Datum dalšího kontaktu"
                name="next_contact_on"
                type="date"
                defaultValue={base.next_contact_on}
              />
              <label>
                Interní poznámka
                <textarea
                  name="internal_note"
                  defaultValue={base.internal_note}
                  maxLength={10000}
                  rows={12}
                />
              </label>
              <p className="muted small">
                Interní poznámka se partnerovi nezobrazuje.
              </p>
            </section>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              {error.includes("mezitím") && (
                <button type="button" onClick={() => void onReload()}>
                  Načíst aktuální data (zahodit rozepsané změny)
                </button>
              )}
            </div>
          )}
          <div className="form-actions">
            <button type="button" onClick={onCancel}>
              Zrušit
            </button>
            <button className="primary" type="submit">
              {busy ? "Ukládám…" : "Uložit partnera"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

function PartnerDetail({
  data,
  prospect: p,
  canEdit,
  onBack,
  onEdit,
  onSave,
  onReload,
}: {
  data: Data;
  prospect: Prospect;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: (d: DeliverableInput) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const o = data.organizations.find((o) => o.id === p.organization_id)!;
  const c = data.people.find((c) => c.id === o.primary_contact_id);
  const s = data.partnerships.find((s) => s.prospect_id === p.id);
  const ds = data.deliverables.filter((d) => d.partnership_id === s?.id);
  const [draft, setDraft] = useState<DeliverableInput | null>(null);
  const [tab, setTab] = useState("overview");
  const owner = data.members.find(
    (m) => m.edition_id === p.edition_id && m.user_id === p.owner_id,
  );
  const history = data.audit
    .filter(
      (a) =>
        a.edition_id === p.edition_id &&
        (a.entity_id === p.id || ds.some((d) => d.id === a.entity_id)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const editable = canEdit && p.status === "potvrzen";
  const edit = (d: Deliverable) => setDraft({ ...d, due_on: d.due_on || "" });
  return (
    <section>
      <button className="back" onClick={onBack}>
        ← Všichni partneři
      </button>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            Partner / {data.editions.find((e) => e.id === p.edition_id)?.name}
          </p>
          <h1>{o.name}</h1>
          <Badge value={p.status} />
        </div>
        {canEdit && <button onClick={onEdit}>Upravit partnera</button>}
      </div>
      <div className="tabs">
        <button
          aria-pressed={tab === "overview"}
          onClick={() => setTab("overview")}
        >
          Přehled a plnění
        </button>
        <button
          aria-pressed={tab === "history"}
          onClick={() => setTab("history")}
        >
          Historie změn ({history.length})
        </button>
      </div>
      {tab === "history" ? (
        <section className="panel">
          <h2>Historie změn</h2>
          {!history.length && (
            <p className="muted">Zatím nejsou zaznamenané změny.</p>
          )}
          {history.map((a) => (
            <details className="audit" key={a.id}>
              <summary>
                {new Date(a.created_at).toLocaleString("cs-CZ", {
                  timeZone: "Europe/Prague",
                })}{" "}
                · {a.entity === "partner" ? "Partner" : "Plnění"}{" "}
                {a.action === "created" ? "vytvořen" : "upraven"} ·{" "}
                {data.members.find(
                  (m) =>
                    m.user_id === a.actor_id && m.edition_id === p.edition_id,
                )?.display_name || "Člen týmu"}
              </summary>
              <div className="audit-values">
                <div>
                  <h3>Před změnou</h3>
                  <pre>{JSON.stringify(a.old_data, null, 2)}</pre>
                </div>
                <div>
                  <h3>Po změně</h3>
                  <pre>{JSON.stringify(a.new_data, null, 2)}</pre>
                </div>
              </div>
            </details>
          ))}
        </section>
      ) : (
        <div className="detail-grid">
          <aside>
            <section className="panel">
              <h2>Kontakt</h2>
              <p>{c?.name || "Kontakt zatím nedoplněn"}</p>
              {c?.email && (
                <p>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </p>
              )}
              {c?.phone && <p>{c.phone}</p>}
              {o.website && isHttpUrl(o.website) && (
                <a href={o.website} target="_blank" rel="noopener noreferrer">
                  Web partnera ↗
                </a>
              )}
              <hr />
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{owner?.display_name}</dd>
                </div>
                <div>
                  <dt>Další kontakt</dt>
                  <dd>{dateLabel(p.next_contact_on)}</dd>
                </div>
                <div>
                  <dt>IČO / země</dt>
                  <dd>
                    {o.registration_id || "Neuvedeno"} / {o.country_code}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <p className="eyebrow">Pouze interně</p>
              <h2>Poznámka</h2>
              <p className="preserve">{p.internal_note || "Bez poznámky."}</p>
            </section>
          </aside>
          <div>
            <section className="panel">
              <div className="section-heading compact">
                <div>
                  <h2>Domluvená plnění</h2>
                  <p className="muted">
                    {ds.filter((d) => d.status === "splněno").length} z{" "}
                    {ds.length} splněno
                  </p>
                </div>
                {editable && s && !draft && (
                  <button
                    onClick={() =>
                      setDraft({
                        partnership_id: s.id,
                        title: "",
                        status: "nesplněno",
                        due_on: "",
                        evidence_url: "",
                      })
                    }
                  >
                    + Přidat plnění
                  </button>
                )}
              </div>
              {p.status !== "potvrzen" && (
                <div className="notice">
                  Plnění lze upravovat až po potvrzení spolupráce. Dřívější
                  záznamy zůstávají zachované.
                </div>
              )}
              {draft && editable ? (
                <DeliverableForm
                  key={draft.id || "new"}
                  initial={draft}
                  onCancel={() => setDraft(null)}
                  onSave={async (d) => {
                    await onSave(d);
                    setDraft(null);
                  }}
                  onReload={async () => {
                    setDraft(null);
                    await onReload();
                  }}
                />
              ) : (
                <>
                  {ds.map((d) => (
                    <article className="deliverable" key={d.id}>
                      <div>
                        <h3>{d.title}</h3>
                        <p className="muted small">{dateLabel(d.due_on)}</p>
                        {d.evidence_url && isHttpUrl(d.evidence_url) && (
                          <a
                            href={d.evidence_url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Otevřít důkaz ↗
                          </a>
                        )}
                      </div>
                      <div className="deliverable-actions">
                        <Badge value={d.status} />
                        {editable && (
                          <button
                            className="quiet"
                            onClick={() => edit(d)}
                            aria-label={`Upravit plnění ${d.title}`}
                          >
                            Upravit
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                  {!ds.length && (
                    <div className="empty">
                      <h3>Zatím bez plnění</h3>
                      <p>
                        Každý domluvený závazek bude mít vlastní stav a
                        volitelný důkaz.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
function DeliverableForm({
  initial,
  onSave,
  onCancel,
  onReload,
}: {
  initial: DeliverableInput;
  onSave: (d: DeliverableInput) => Promise<void>;
  onCancel: () => void;
  onReload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...initial,
        ...Object.fromEntries(f.entries()),
      } as DeliverableInput);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="fulfillment-form" onSubmit={submit}>
      <fieldset disabled={busy}>
        <h3>{initial.id ? "Upravit plnění" : "Nové plnění"}</h3>
        <Field
          label="Název plnění"
          name="title"
          defaultValue={initial.title}
          required
          maxLength={300}
        />
        <div className="field-row">
          <label>
            Stav plnění
            <select name="status" defaultValue={initial.status}>
              {fulfillmentStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Field
            label="Termín"
            name="due_on"
            type="date"
            defaultValue={initial.due_on}
          />
        </div>
        <Field
          label="Důkaz — odkaz"
          name="evidence_url"
          type="url"
          defaultValue={initial.evidence_url}
          maxLength={2000}
        />
        {error && (
          <div role="alert" className="error">
            {error}
            {error.includes("mezitím") && (
              <button type="button" onClick={() => void onReload()}>
                Načíst aktuální data (zahodit rozepsané změny)
              </button>
            )}
          </div>
        )}
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Zrušit
          </button>
          <button type="submit" className="primary">
            {busy ? "Ukládám…" : "Uložit plnění"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
