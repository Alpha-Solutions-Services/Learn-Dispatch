import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { resolveSearchParams } from "@/lib/next/resolve-search-params";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import {
  listPublishedModules,
  listStudentNotes,
  listStudentProgress,
} from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My learning — Learn Dispatch",
};

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ welcome?: string }>
    | { welcome?: string };
}) {
  const sp = await resolveSearchParams(searchParams);
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  if (access && access.role && access.role !== "student") {
    redirect(access.role === "instructor" || access.role === "dispatcher" ? "/admin/enrollments" : "/login");
  }

  const paid = isPaidAccessActive(access);
  const pendingPayment =
    !paid &&
    (access?.enrollment_status === "pending" ||
      access?.enrollment_status === "unpaid" ||
      !access?.enrollment_status);
  const expired = access?.enrollment_status === "expired";

  const modules = await listPublishedModules();
  const progressRows = paid ? await listStudentProgress(user.id) : [];
  const notes = paid ? await listStudentNotes(user.id) : [];
  const progressMap = new Map(
    progressRows.map((p) => [p.module_id as string, p as Record<string, unknown>]),
  );
  const completed = modules.filter(
    (m) => progressMap.get(m.id as string)?.status === "completed",
  ).length;
  const pct = modules.length ? Math.round((completed / modules.length) * 100) : 0;
  const firstModuleId = modules[0]?.id as string | undefined;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      {sp?.welcome === "enrolled" || pendingPayment ? (
        <div className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-amber-50">
            {sp?.welcome === "enrolled"
              ? "Welcome to Learn Dispatch Studio"
              : "Payment required to unlock lessons"}
          </p>
          <p className="mt-1 text-sm text-amber-100/80">
            Your enrollment is on file. Send NayaPay, then mark payment so your instructor can verify
            and unlock every module.
          </p>
          <Link
            href="/enroll?reason=payment"
            className="mt-3 inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-[#05080f]"
          >
            Complete payment →
          </Link>
        </div>
      ) : null}

      {expired ? (
        <div className="mb-6 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-4 text-sm text-red-100">
          Your access window ended.{" "}
          <Link href="/enroll?reason=expired" className="font-semibold underline">
            Renew enrollment
          </Link>
        </div>
      ) : null}

      {sp?.welcome && paid ? (
        <p className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Welcome — payment verified. Continue your learning path below.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[#0a1220] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Contents
            </p>
            <h1
              className="mt-2 text-xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Truck dispatcher course
            </h1>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${paid ? pct : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {paid
                ? `${completed} of ${modules.length} modules · ${pct}%`
                : `${modules.length} modules · locked until payment`}
            </p>
          </div>

          <nav className="max-h-[min(62vh,560px)] space-y-0.5 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[#080e18] p-2">
            {modules.map((m, idx) => {
              const status =
                (progressMap.get(m.id as string)?.status as string) ?? "not_started";
              const done = status === "completed";
              const href = paid
                ? `/student/modules/${m.id as string}`
                : "/enroll?reason=payment";
              return (
                <Link
                  key={m.id as string}
                  href={href}
                  className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
                >
                  <span className="mt-0.5 text-[var(--color-muted)]">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : paid ? (
                      <PlayCircle className="h-4 w-4 text-[var(--color-accent)]" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-[var(--color-chrome)]">
                      {String((m.sort_order as number) ?? idx + 1).padStart(2, "0")}
                      {paid ? "" : " · locked"}
                    </p>
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">
                      {m.title as string}
                    </p>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[radial-gradient(ellipse_at_top,_rgba(56,163,255,0.16),transparent_55%),#0a1220]">
            <div className="border-b border-[var(--color-border)] px-6 py-5 sm:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Overview
              </p>
              <h2
                className="mt-2 text-2xl font-bold text-[var(--color-text)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Alpha Freight Network — dispatcher training
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
                US map, equipment, docs, RC/BOL/POD, load boards, and quiz checkpoints — built for
                AFN truck dispatchers.
              </p>
              {paid && firstModuleId ? (
                <Link
                  href={`/student/modules/${firstModuleId}`}
                  className="mt-5 inline-flex rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-[#05080f]"
                >
                  Continue learning
                </Link>
              ) : (
                <Link
                  href="/enroll?reason=payment"
                  className="mt-5 inline-flex rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-[#05080f]"
                >
                  Unlock course
                </Link>
              )}
            </div>

            <ul className="divide-y divide-[var(--color-border)]/70">
              {modules.map((m) => {
                const row = progressMap.get(m.id as string);
                const status = (row?.status as string) ?? "not_started";
                const quizScore = row?.quiz_score as number | undefined;
                const href = paid
                  ? `/student/modules/${m.id as string}`
                  : "/enroll?reason=payment";
                return (
                  <li key={m.id as string}>
                    <Link
                      href={href}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition hover:bg-white/[0.03] sm:px-8"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {(m.sort_order as number) ?? 0}. {m.title as string}
                        </p>
                        {m.summary ? (
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                            {m.summary as string}
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                        {paid ? null : <Lock className="h-3 w-3" />}
                        {paid
                          ? `${status.replace("_", " ")}${typeof quizScore === "number" ? ` · ${quizScore}%` : ""}`
                          : "Locked"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {notes.length > 0 ? (
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Instructor notes</h2>
              <ul className="mt-4 space-y-3">
                {notes.map((n) => (
                  <li
                    key={n.id as string}
                    className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)]"
                  >
                    {n.body as string}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
