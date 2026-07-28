"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function authErrorMessage(reason: string | null): string {
  if (!reason) {
    return "Authentication failed. Try Continue with Google again, or confirm Supabase Redirect URLs include https://portal.alphasolutions.software/auth/callback";
  }
  const decoded = decodeURIComponent(reason);
  if (decoded === "not_admin") {
    return "This Google account is not authorized for admin access.";
  }
  if (decoded === "missing_code") {
    return "Sign-in was interrupted (missing auth code). Try Continue with Google again.";
  }
  if (/redirect|url not allowed|not allowed/i.test(decoded)) {
    return `${decoded} — add https://portal.alphasolutions.software/auth/callback in Supabase → Authentication → URL Configuration → Redirect URLs.`;
  }
  return decoded;
}

export function LoginForm({ defaultAdmin = false }: { defaultAdmin?: boolean }) {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    sp?.get("error") === "auth" ? authErrorMessage(sp.get("reason")) : null,
  );
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(
    defaultAdmin ? "signin" : "signin"
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Auth is not configured");
      setBusy(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }

      const staffRes = await fetch("/api/staff");
      const isAdmin = staffRes.ok;
      if (defaultAdmin && !isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account is not authorized for admin access");
      }
      window.location.href = isAdmin ? "/admin" : "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Auth is not configured (missing Supabase env on Vercel)");
      setBusy(false);
      return;
    }
    const next = defaultAdmin ? "/admin" : "/dashboard";
    // Include next in redirectTo so the server callback can route without sessionStorage.
    // Supabase matches the path; query string is fine when /auth/callback is allowlisted.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (err) {
      setError(
        err.message.includes("provider")
          ? "Google sign-in is not enabled in Supabase Auth → Providers."
          : `${err.message} — add https://portal.alphasolutions.software/auth/callback to Supabase Auth → URL Configuration → Redirect URLs.`
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 shadow-[var(--glow-md)]">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/alpha-logo.png"
          alt="Alpha Solutions"
          width={64}
          height={64}
          className="mb-3 rounded-xl"
        />
        <h1
          className="text-2xl font-bold text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {defaultAdmin ? "Admin login" : "Client portal"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          portal.alphasolutions.software
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--color-accent)] py-3 text-sm font-semibold text-[#05080f] disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void google()}
        className="mt-3 w-full rounded-xl border border-[var(--color-border)] py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
      >
        Continue with Google
      </button>

      {!defaultAdmin ? (
        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)]"
          onClick={() =>
            setMode((m) => (m === "signin" ? "signup" : "signin"))
          }
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      ) : null}

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        <a
          href={defaultAdmin ? "/login" : "/login?role=admin"}
          className="text-[var(--color-accent)] hover:underline"
        >
          {defaultAdmin ? "Client login" : "Admin login"}
        </a>
      </p>
    </div>
  );
}
