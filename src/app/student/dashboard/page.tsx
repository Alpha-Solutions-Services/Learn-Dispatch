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
  title: "Student Dashboard — Learn Dispatch",
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

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {sp?.welcome ? (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Welcome — your payment was verified. Work through the modules below.
          </p>
        ) : null}

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-8">
          <h1
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Course modules
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {completed} of {modules.length} modules completed.
          </p>
          <ol className="mt-8 space-y-3">
            {modules.length === 0 ? (
              <li className="text-sm text-[var(--color-muted)]">
                Modules will appear here once published.
              </li>
            ) : (
              modules.map((m) => {
                const row = progressMap.get(m.id as string);
                const status = (row?.status as string) ?? "not_started";
                const quizScore = row?.quiz_score as number | undefined;
                return (
                  <li key={m.id as string}>
                    <Link
                      href={`/student/modules/${m.id as string}`}
                      className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-3 transition hover:border-[var(--color-border-glow)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {(m.sort_order as number) ?? 0}. {m.title as string}
                          </p>
                          {m.summary ? (
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {m.summary as string}
                            </p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-[var(--color-muted)]">
                          {status.replace("_", " ")}
                          {typeof quizScore === "number" ? ` · ${quizScore}%` : ""}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ol>
        </div>

        {notes.length > 0 ? (
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-8">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Instructor notes
            </h2>
            <ul className="mt-4 space-y-3">
              {notes.map((n) => (
                <li
                  key={n.id as string}
                  className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm"
                >
                  <p className="text-[var(--color-text)]">{n.body as string}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]"
        >
          ← Course overview
        </Link>
      </div>
    </main>
  );
}
