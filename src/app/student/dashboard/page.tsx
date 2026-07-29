import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  searchParams?: Promise<{ welcome?: string }> | { welcome?: string };
}) {
  const sp = await resolveSearchParams(searchParams);
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) {
    redirect(
      access?.enrollment_status === "expired"
        ? "/enroll?reason=expired"
        : "/enroll?reason=payment",
    );
  }

  const modules = await listPublishedModules();
  const progressRows = await listStudentProgress(user.id);
  const notes = await listStudentNotes(user.id);
  const progressMap = new Map(
    progressRows.map((p) => [p.module_id as string, p as Record<string, unknown>]),
  );
  const completed = modules.filter(
    (m) => progressMap.get(m.id as string)?.status === "completed",
  ).length;
  const pct = modules.length ? Math.round((completed / modules.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {sp?.welcome ? (
        <p className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Welcome — payment verified. Continue your learning path below.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Learning path
            </p>
            <h1
              className="mt-2 text-xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Truck dispatcher course
            </h1>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {completed} of {modules.length} modules · {pct}%
            </p>
          </div>
          <nav className="max-h-[60vh] space-y-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/30 p-2">
            {modules.map((m) => {
              const status = (progressMap.get(m.id as string)?.status as string) ?? "not_started";
              return (
                <Link
                  key={m.id as string}
                  href={`/student/modules/${m.id as string}`}
                  className="block rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <p className="text-[10px] font-mono text-[var(--color-accent)]">
                    {String((m.sort_order as number) ?? 0).padStart(2, "0")}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-text)]">{m.title as string}</p>
                  <p className="text-[10px] uppercase text-[var(--color-muted)]">
                    {status.replace("_", " ")}
                  </p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Continue learning</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Open a module for the lesson video, notes, and quiz (pass ≥ 70%).
            </p>
            <ul className="mt-6 space-y-3">
              {modules.map((m) => {
                const row = progressMap.get(m.id as string);
                const status = (row?.status as string) ?? "not_started";
                const quizScore = row?.quiz_score as number | undefined;
                return (
                  <li key={m.id as string}>
                    <Link
                      href={`/student/modules/${m.id as string}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-4 transition hover:border-[var(--color-border-glow)]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {(m.sort_order as number) ?? 0}. {m.title as string}
                        </p>
                        {m.summary ? (
                          <p className="mt-1 text-xs text-[var(--color-muted)]">{m.summary as string}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                        {status.replace("_", " ")}
                        {typeof quizScore === "number" ? ` · ${quizScore}%` : ""}
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
