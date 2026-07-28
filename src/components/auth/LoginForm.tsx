"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function authErrorMessage(reason: string | null): string {
  const callback =
    "https://learndispatch.alphasolutions.software/auth/callback";
  if (!reason) {
    return `Authentication failed. Try again, or add ${callback} in Supabase → Authentication → URL Configuration → Redirect URLs.`;
  }
  const decoded = decodeURIComponent(reason);
  if (decoded === "not_admin" || decoded === "unauthorized") {
    return "This account is not authorized for instructor access. Ask an admin to add your email to ADMIN_EMAILS or set your profile role to instructor.";
  }
  if (decoded === "unauthorized_instructor") {
    return "Instructor access only. Students should use Student login.";
  }
  if (decoded === "missing_code") {
    return "Sign-in was interrupted. Try Continue with Google again.";
  }
  if (decoded === "missing_supabase_env") {
    return "Supabase env vars are missing on Vercel. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }
  if (/redirect|url not allowed|not allowed|redirect_uri/i.test(decoded)) {
    return `${decoded} — add ${callback} in Supabase → Authentication → Redirect URLs, then try again.`;
  }
  return decoded;
}

async function resolveAfterLogin(): Promise<string> {
  const supabase = createClient();
  if (!supabase) return "/login";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, enrollment_status")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;

  if (role === "instructor" || role === "dispatcher") {
    return "/admin/enrollments";
  }
  if (role === "student") {
    return profile?.enrollment_status === "paid"
      ? "/student/dashboard"
      : "/enroll?reason=payment";
  }

  // Staff allowlist (ADMIN_EMAILS) — payment verification
  const staffRes = await fetch("/api/staff");
  if (staffRes.ok) return "/admin/enrollments";

  return "/enroll";
}

export function LoginForm({ defaultAdmin = false }: { defaultAdmin?: boolean }) {
  const sp = useSearchParams();
  const instructorMode = defaultAdmin || sp?.get("role") === "instructor";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    sp?.get("error") === "auth" || sp?.get("error") === "unauthorized"
      ? authErrorMessage(sp.get("reason") || sp.get("error"))
      : null,
  );
  const [busy, setBusy] = useState(false);

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
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;

      const dest = await resolveAfterLogin();

      if (instructorMode) {
        const isInstructorDest =
          dest.startsWith("/admin") || dest.includes("enrollments");
        if (!isInstructorDest) {
          await supabase.auth.signOut();
          throw new Error("This account is not authorized for instructor access");
        }
      }

      if (!instructorMode && dest.startsWith("/admin")) {
        // Student form used by instructor — still send them to instructor area
        window.location.href = dest;
        return;
      }

      window.location.href = dest;
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
    const next = instructorMode ? "/admin/enrollments" : "/student/dashboard";
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
          : `${err.message} — add https://learndispatch.alphasolutions.software/auth/callback to Supabase Redirect URLs.`,
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 shadow-[var(--glow-md)]">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/alpha-logo.png"
          alt="Learn Dispatch"
          width={64}
          height={64}
          className="mb-3 rounded-xl"
        />
        <h1
          className="text-2xl font-bold text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {instructorMode ? "Instructor login" : "Student portal"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-accent)]">
          learndispatch.alphasolutions.software
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
          {busy ? "Please wait…" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void google()}
        className="mt-3 w-full rounded-xl border border-[var(--color-border)] py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
      >
        Continue with Google
      </button>

      {!instructorMode ? (
        <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
          New student?{" "}
          <Link href="/enroll" className="text-[var(--color-accent)] hover:underline">
            Enroll here
          </Link>
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        <Link
          href={instructorMode ? "/login" : "/login?role=instructor"}
          className="text-[var(--color-accent)] hover:underline"
        >
          {instructorMode ? "Student login" : "Instructor login"}
        </Link>
      </p>
    </div>
  );
}
