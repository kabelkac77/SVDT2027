"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/backend";

export function WhatsAppLogin({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    if (lock.current || disabled || cooldown > 0) return;
    const normalized = phone.trim().replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      setError(
        "Zadej telefon včetně mezinárodní předvolby, například +420 777 123 456.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    // Local debounce is only UX. Supabase/Twilio must enforce rate limits.
    setCooldown(60);
    try {
      const db = supabase();
      if (!db) throw new Error("configuration");
      const { error } = await db.auth.signInWithOtp({
        phone: normalized,
        options: { channel: "whatsapp", shouldCreateUser: true },
      });
      if (error) throw error;
      setSentTo(normalized);
      setCode("");
    } catch {
      setError(
        "Kód se nepodařilo odeslat. Za chvíli to zkus znovu nebo použij jiný způsob přihlášení.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || disabled) return;
    if (!sentTo) {
      await send();
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Zadej šestimístný kód ze zprávy.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const db = supabase();
      if (!db) throw new Error("configuration");
      const { data, error } = await db.auth.verifyOtp({
        phone: sentTo,
        token: code.trim(),
        type: "sms",
      });
      // Supabase calls phone verification 'sms' even for WhatsApp delivery.
      if (error || !data.session) throw new Error("verification");
      setCode("");
    } catch {
      setError(
        "Kód není platný nebo již vypršel. Zkontroluj jej, případně si nech poslat nový.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        Pokračovat přes WhatsApp
      </button>
    );
  return (
    <form onSubmit={verify} aria-label="Přihlášení přes WhatsApp">
      {!sentTo ? (
        <label>
          Telefon s předvolbou
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+420 777 123 456"
            required
            disabled={busy || disabled}
          />
        </label>
      ) : (
        <>
          <p role="status">Kód byl odeslán na WhatsApp čísla {sentTo}.</p>
          <label>
            Kód z WhatsAppu
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={busy || disabled}
            />
          </label>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || disabled || (!sentTo && cooldown > 0)}
      >
        {busy
          ? "Čekej prosím…"
          : sentTo
            ? "Ověřit kód a přihlásit se"
            : "Poslat kód na WhatsApp"}
      </button>
      {sentTo && (
        <button
          type="button"
          disabled={busy || disabled || cooldown > 0}
          onClick={() => void send()}
        >
          Poslat nový kód
        </button>
      )}
      {cooldown > 0 && (
        <p className="muted">Další kód lze vyžádat za {cooldown} s.</p>
      )}
      {sentTo && (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={() => {
            setSentTo("");
            setCode("");
            setError("");
          }}
        >
          Změnit telefon
        </button>
      )}
      <p className="muted">
        Pošleme ti jednorázový přihlašovací kód. Nepřihlašuješ se tím k odběru
        zpráv.
      </p>
    </form>
  );
}
