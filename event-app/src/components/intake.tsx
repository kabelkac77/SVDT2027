"use client";
import { useState } from "react";
import { emptyPartner, normalized, PartnerInput } from "@/lib/model";
type Candidate = {
  name: string;
  classification: "svdt_candidate" | "review";
  reasons: string[];
  emails: string[];
  records: Record<string, unknown>[];
};
type IntakeData = {
  format: string;
  source_url: string;
  target_year: number;
  candidates: Candidate[];
  unnamed: unknown[];
  source_file: string;
};
const labels: Record<string, string> = {
  task: "Úkol",
  status_note: "Stav ve zdroji",
  billing_note: "Fakturace",
  confirmed_2027: "2027 potvrzené",
  estimate_2027: "2027 odhad",
  history_2026: "2026",
  history_2025: "2025",
  note: "Poznámka",
  partnership_type: "Typ",
  contact_raw: "Kontakty",
  fulfillment_raw: "Plnění",
};
export function Intake({
  onChoose,
  year,
}: {
  onChoose?: (p: PartnerInput) => void;
  year?: number;
}) {
  const [data, setData] = useState<IntakeData | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("svdt_candidate");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  async function load(file: File) {
    try {
      if (file.size > 5_000_000)
        throw Error(
          "Soubor je příliš velký. Použij výstup filtru podkladů do 5 MB.",
        );
      const d = JSON.parse(await file.text());
      if (
        d.format !== "svdt-partner-intake-v1" ||
        d.target_year !== 2027 ||
        !Array.isArray(d.candidates) ||
        !Array.isArray(d.unnamed) ||
        typeof d.source_url !== "string" ||
        typeof d.source_file !== "string" ||
        d.candidates.length > 3000
      )
        throw Error("Vyber JSON vytvořený filtrem partnerského Excelu.");
      for (const c of d.candidates)
        if (
          typeof c.name !== "string" ||
          !["svdt_candidate", "review"].includes(c.classification) ||
          !Array.isArray(c.records) ||
          !c.records.every((r: unknown) => r && typeof r === "object") ||
          !Array.isArray(c.reasons) ||
          !c.reasons.every((x: unknown) => typeof x === "string") ||
          !Array.isArray(c.emails) ||
          !c.emails.every((x: unknown) => typeof x === "string")
        )
          throw Error(
            "Podklad má neplatnou strukturu. Vytvoř jej filtrem znovu.",
          );
      setData(d);
      setSelected(null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Soubor nelze načíst.");
    }
  }
  function choose(c: Candidate) {
    if (!data || !onChoose) return;
    const note = [
      `Zdroj: ${data.source_file}\n${data.source_url}`,
      ...c.records.map(
        (r) =>
          `${r.sheet}, řádek ${r.row}\n` +
          Object.entries(labels)
            .filter(([k]) => r[k] !== null && r[k] !== undefined && r[k] !== "")
            .map(([k, l]) => `${l}: ${String(r[k])}`)
            .join("\n"),
      ),
    ].join("\n\n");
    onChoose({ ...emptyPartner(), name: c.name, internal_note: note });
  }
  const shown =
    data?.candidates.filter(
      (c) =>
        (filter === "all" || c.classification === filter) &&
        normalized(c.name).includes(normalized(query)),
    ) || [];
  return (
    <section className="intake">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Zdrojové podklady</p>
          <h1>Nejdřív zkontrolovat.</h1>
          <p className="muted">
            Historie spolupráce není potvrzením pro nový ročník.
          </p>
        </div>
      </div>
      <div className="notice">
        Podklad se čte pouze v tomto prohlížeči. Do evidence se uloží až
        zkontrolovaný formulář. Všechny kontakty a původní poznámky se
        zachovají.
      </div>
      <label className="file-picker">
        Načíst partnerský podklad (.json)
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {data && (
        <>
          <p>
            {data.source_file} · {data.candidates.length} skupin názvů ·{" "}
            {data.unnamed.length} bezejmenných řádků odděleno
          </p>
          <div className="filters">
            <label>
              Hledat
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Název partnera"
              />
            </label>
            <label>
              Zařazení
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="svdt_candidate">S vazbou na SVDT</option>
                <option value="review">Ověřit akci</option>
                <option value="all">Všechny podklady</option>
              </select>
            </label>
          </div>
          <div className="intake-grid">
            <div className="candidate-list">
              {shown.map((c, i) => (
                <button
                  key={i}
                  className={selected === c ? "candidate active" : "candidate"}
                  onClick={() => setSelected(c)}
                >
                  <strong>{c.name}</strong>
                  <small>
                    {c.records.length > 1
                      ? `${c.records.length} zdrojové řádky`
                      : "1 zdrojový řádek"}{" "}
                    ·{" "}
                    {c.classification === "review"
                      ? "Ověřit akci"
                      : "Vazba na SVDT"}
                  </small>
                </button>
              ))}
              {!shown.length && <p>Žádný podklad neodpovídá filtru.</p>}
            </div>
            <div className="panel">
              {selected ? (
                <>
                  <h2>{selected.name}</h2>
                  <p>{[...new Set(selected.reasons)].join(" ")}</p>
                  <p className="muted">
                    Kontakty:{" "}
                    {selected.emails.join(", ") || "Ve zdroji neuvedeny"}
                  </p>
                  {selected.records.map((r, i) => (
                    <div className="source-record" key={i}>
                      <h3>
                        {String(r.sheet)} · řádek {String(r.row)}
                      </h3>
                      <dl>
                        {Object.entries(labels)
                          .filter(
                            ([k]) =>
                              r[k] !== null &&
                              r[k] !== undefined &&
                              r[k] !== "",
                          )
                          .map(([k, l]) => (
                            <div key={k}>
                              <dt>{l}</dt>
                              <dd>{String(r[k])}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  ))}
                  {onChoose && year === data.target_year ? (
                    <button
                      className="primary"
                      onClick={() => choose(selected)}
                    >
                      Zkontrolovat ve formuláři
                    </button>
                  ) : (
                    <p className="muted">
                      Uložení je dostupné přihlášenému správci aktivního ročníku{" "}
                      {data.target_year}.
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">
                  Vyber podklad vlevo. Podobné názvy ani historické částky se
                  automaticky neslučují.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
