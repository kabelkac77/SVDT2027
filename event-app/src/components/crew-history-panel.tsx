"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadCrewHistoryIndex, loadCrewHistoryRow } from "../lib/crew-backend";
import {
  historyError,
  historyMessage,
  type CrewHistoryError,
  type HistoryRow,
  type HistorySource,
  type HistoryValue,
} from "../lib/crew-history";

type State<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; value: T }
  | { kind: "error"; error: CrewHistoryError };
function valueText(value: HistoryValue): string {
  if (value === null) return "Prázdná hodnota / NULL";
  if (value === "") return 'Prázdný řetězec / ""';
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
function OriginalRow({ row }: { row: Record<string, HistoryValue> }) {
  return (
    <dl className="crew-history-fields">
      {Object.entries(row).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            {key === "content" ? (
              <details>
                <summary>Zobrazit původní obsah</summary>
                <pre tabIndex={0}>{valueText(value)}</pre>
              </details>
            ) : (
              <pre tabIndex={0}>{valueText(value)}</pre>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CrewHistoryPanel({
  editionId,
  rosterId,
}: {
  editionId: string;
  rosterId: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<State<HistorySource[]>>({ kind: "idle" });
  const [row, setRow] = useState<State<HistoryRow>>({ kind: "idle" });
  const [selected, setSelected] = useState<string | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  function invalidate() {
    generation.current += 1;
    controller.current?.abort();
    controller.current = null;
  }
  useEffect(
    () => () => {
      generation.current += 1;
      controller.current?.abort();
    },
    [],
  );

  function close() {
    invalidate();
    setOpen(false);
    setIndex({ kind: "idle" });
    setRow({ kind: "idle" });
    setSelected(null);
    toggle.current?.focus();
  }
  async function loadIndex() {
    invalidate();
    const request = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setOpen(true);
    setIndex({ kind: "loading" });
    setRow({ kind: "idle" });
    setSelected(null);
    try {
      const result = await loadCrewHistoryIndex(
        editionId,
        rosterId,
        abort.signal,
      );
      if (generation.current === request)
        setIndex({ kind: "ready", value: result.sources });
    } catch (error) {
      if (generation.current === request)
        setIndex({ kind: "error", error: historyError(error) });
    }
  }
  async function select(source: HistorySource) {
    invalidate();
    const request = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setSelected(source.packageId);
    setRow({ kind: "loading" });
    try {
      const result = await loadCrewHistoryRow(
        editionId,
        rosterId,
        source,
        abort.signal,
      );
      if (generation.current === request)
        setRow({ kind: "ready", value: result });
    } catch (error) {
      if (generation.current !== request) return;
      const safe = historyError(error);
      if (safe.kind === "denied") {
        setRow({ kind: "idle" });
        setSelected(null);
        setIndex({ kind: "error", error: safe });
      } else setRow({ kind: "error", error: safe });
    }
  }
  return (
    <section className="crew-history">
      <h3>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => (open ? close() : void loadIndex())}
        >
          Původ a historie
        </button>
      </h3>
      {open && (
        <div id={id} role="region" aria-label="Původ a historie">
          {index.kind === "loading" && (
            <p role="status">Načítám seznam podkladů…</p>
          )}
          {index.kind === "error" && (
            <div role="alert">
              <p>{historyMessage(index.error)}</p>
              <button type="button" onClick={() => void loadIndex()}>
                Znovu načíst seznam podkladů
              </button>
            </div>
          )}
          {index.kind === "ready" && (
            <>
              {index.value.length === 0 ? (
                <p>K tomuto záznamu zatím není připojený původní podklad.</p>
              ) : (
                <ol className="crew-history-sources">
                  {index.value.map((source, position) => (
                    <li key={source.packageId}>
                      <span>
                        Podklad {position + 1} ·{" "}
                        <time dateTime={source.capturedAt}>
                          {new Intl.DateTimeFormat("cs-CZ", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(source.capturedAt))}
                        </time>
                      </span>
                      <button
                        type="button"
                        aria-pressed={selected === source.packageId}
                        onClick={() => void select(source)}
                      >
                        Zobrazit podklad {position + 1}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {row.kind === "loading" && (
                <p role="status">Načítám vybraný podklad…</p>
              )}
              {row.kind === "error" && (
                <p role="alert">
                  {historyMessage(row.error)} Zkus znovu vybrat podklad.
                </p>
              )}
              {row.kind === "ready" && (
                <div className="crew-history-original">
                  <p>
                    Podklad pro porovnání. Účast ani finanční domluvu pro
                    aktuální ročník nepotvrzuje.
                  </p>
                  <h4>Původní pracovní záznam 2027</h4>
                  <p>Uložený zdroj převodu, nikoli dnešní editovatelný stav.</p>
                  <OriginalRow row={row.value.sourceRow} />
                  {row.value.historyRow === null ? (
                    <p>Tento podklad nemá navázaný historický řádek 2026.</p>
                  ) : (
                    <>
                      <h4>Navázaná historie 2026</h4>
                      <OriginalRow row={row.value.historyRow} />
                    </>
                  )}
                </div>
              )}
            </>
          )}
          <button type="button" onClick={close}>
            Zavřít historii
          </button>
        </div>
      )}
    </section>
  );
}
