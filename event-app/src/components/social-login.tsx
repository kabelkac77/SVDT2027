"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/backend";
import { WhatsAppLogin } from "./whatsapp-login";

const providers = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
] as const;
type Provider = (typeof providers)[number]["id"];

export function SocialLogin({ disabled }: { disabled: boolean }) {
  const [enabled, setEnabled] = useState<Provider[]>([]);
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phoneEnabled, setPhoneEnabled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setUnavailable(false);
    async function load() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("settings");
        const settings = await response.json();
        if (alive) {
          setPhoneEnabled(settings.external?.phone === true);
          setEnabled(
            providers
              .filter((p) => settings.external?.[p.id] === true)
              .map((p) => p.id),
          );
        }
      } catch {
        if (alive) setUnavailable(true);
      } finally {
        clearTimeout(timeout);
      }
    }
    void load();
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  async function login(provider: Provider) {
    if (pending || disabled) return;
    setPending(provider);
    setError("");
    try {
      const db = supabase();
      if (!db) throw new Error("configuration");
      const { data, error } = await db.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data.url) throw new Error("oauth");
      window.location.assign(data.url);
    } catch {
      setError(
        "Přihlášení se nepodařilo spustit. Zkus to znovu nebo použij e-mail a heslo.",
      );
      setPending(null);
    }
  }

  return (
    <div className="social-login">
      {phoneEnabled && process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true" && (
        <WhatsAppLogin disabled={disabled || pending !== null} />
      )}
      {providers
        .filter((p) => enabled.includes(p.id))
        .map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled || pending !== null}
            onClick={() => void login(p.id)}
          >
            {pending === p.id ? "Přesměrovávám…" : `Pokračovat přes ${p.label}`}
          </button>
        ))}
      {enabled.length > 0 && (
        <p className="muted">Nebo použij e-mail a heslo</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {unavailable && (
        <p className="muted">
          Další možnosti přihlášení se nepodařilo načíst.{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Zkusit znovu
          </button>
        </p>
      )}
    </div>
  );
}
