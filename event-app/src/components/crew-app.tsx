"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/backend';
import { CrewWorkspace } from './crew-workspace';
import { SocialLogin } from './social-login';

const AUTH_ERROR = 'Přihlášení se nezdařilo. Zkontroluj e-mail a heslo.';
const LOGOUT_ERROR = 'Odhlášení se nezdařilo. Zkus to znovu.';
const CONFIG_ERROR = 'Přihlášení není dostupné – čeká na dokončení nastavení správcem.';

function getClient() {
  try {
    return supabase();
  } catch {
    return null;
  }
}

export function CrewApp() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const activeRef = useRef(true);
  const eventSeqRef = useRef(0);
  const effectGenerationRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const identityVersionRef = useRef(0);
  const signingInRef = useRef(false);

  const applyUserId = useCallback((nextId: string | null, accountEmail = '') => {
    setUserEmail(nextId ? accountEmail : '');
    if (currentUserIdRef.current === nextId) return;
    currentUserIdRef.current = nextId;
    identityVersionRef.current += 1;
    setUserId(nextId);
    setError(null);
    if (nextId) setPassword('');
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const callback = new URL(window.location.href);
    const fragment = new URLSearchParams(callback.hash.slice(1));
    if (callback.searchParams.has('error') || fragment.has('error')) {
      setError('Přihlášení nebylo dokončeno. Zkus to znovu nebo zvol jiný účet.');
      for (const key of ['error', 'error_code', 'error_description']) {
        callback.searchParams.delete(key); fragment.delete(key);
      }
      callback.hash = fragment.toString();
      window.history.replaceState(null, '', callback.pathname + callback.search + callback.hash);
    }
    const generation = ++effectGenerationRef.current;
    const live = () => activeRef.current && generation === effectGenerationRef.current;
    const client = getClient();
    if (!client) {
      setConfigError(true);
      setChecking(false);
      return () => {
        activeRef.current = false;
        effectGenerationRef.current += 1;
      };
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!live()) return;
      eventSeqRef.current += 1;
      applyUserId(session?.user?.id ?? null, session?.user?.email ?? '');
      setChecking(false);
    });

    const seqAtRequest = eventSeqRef.current;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!live() || eventSeqRef.current !== seqAtRequest) return;
      if (sessionError) setError('Přihlášení se nepodařilo ověřit. Zkus obnovit stránku.');
      else applyUserId(data.session?.user?.id ?? null, data.session?.user?.email ?? '');
      setChecking(false);
    }).catch(() => {
      if (!live() || eventSeqRef.current !== seqAtRequest) return;
      setError('Přihlášení se nepodařilo ověřit. Zkus obnovit stránku.');
      setChecking(false);
    });

    return () => {
      activeRef.current = false;
        effectGenerationRef.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, [applyUserId]);

  const logout = useCallback(async () => {
    setError(null);
    const version = identityVersionRef.current;
    try {
      const client = getClient();
      if (!client) throw Error(LOGOUT_ERROR);
      const result = await client.auth.signOut();
      if (result.error) throw Error(LOGOUT_ERROR);
    } catch {
      if (activeRef.current && version === identityVersionRef.current) setError(LOGOUT_ERROR);
      throw Error(LOGOUT_ERROR);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (signingInRef.current || configError) return;
      signingInRef.current = true;
      setSigningIn(true);
      setError(null);
      const versionAtRequest = identityVersionRef.current;
      const client = getClient();
      if (!client) {
        setError(AUTH_ERROR);
        signingInRef.current = false;
        setSigningIn(false);
        return;
      }
      try {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError && activeRef.current && identityVersionRef.current === versionAtRequest) {
          setError(AUTH_ERROR);
        }
      } catch {
        if (activeRef.current && identityVersionRef.current === versionAtRequest) {
          setError(AUTH_ERROR);
        }
      } finally {
        signingInRef.current = false;
        if (activeRef.current) {
          setSigningIn(false);
        }
      }
    },
    [configError, email, password]
  );

  if (userId) {
    return <>{error && <p className="crew-auth-error" role="alert">{error}</p>}<CrewWorkspace key={userId} userId={userId} userEmail={userEmail} onLogout={logout} /></>;
  }

  return (
    <div className="auth">
      <header>
        <h1>SVDT</h1>
        <p>Lidi a crew</p>
      </header>
      {checking ? <p role="status">Ověřuji přihlášení…</p> : configError ? (
        <p>{CONFIG_ERROR}</p>
      ) : (
        <><SocialLogin disabled={signingIn} returnPath="/crew" allowPhone={false} /><form onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Heslo
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" disabled={signingIn}>
            Přihlásit se
          </button>
        </form></>
      )}
    </div>
  );
}
