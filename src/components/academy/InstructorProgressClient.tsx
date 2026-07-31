"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { StudentProgressReportRow } from "@/lib/academy/academy-db";

type ModuleRow = { id: string; title: string; sort_order: number };

export default function InstructorProgressClient() {
  const [students, setStudents] = useState<StudentProgressReportRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "weak">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, mRes] = await Promise.all([
        fetch("/api/academy/student-progress-report"),
        fetch("/api/academy/modules-list"),
      ]);
      const rBody = (await rRes.json()) as {
        students?: StudentProgressReportRow[];
        error?: string;
      };
      const mBody = (await mRes.json()) as { modules?: ModuleRow[]; error?: string };
      if (!rRes.ok) throw new Error(rBody.error ?? "Report failed");
      if (!mRes.ok) throw new Error(mBody.error ?? "Modules failed");
      setStudents(rBody.students ?? []);
      setModules(mBody.modules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "weak") return students.filter((s) => s.weakModules.length > 0);
    return students;
  }, [filter, students]);

  async function assignRetake(studentId: string, moduleId: string) {
    const key = `${studentId}:${moduleId}`;
    setBusyKey(key);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/academy/quiz-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
          note: "Instructor retake — new AI quiz unlocked",
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Assign failed");
      setMsg("Retake assigned. Student can generate a new AI quiz on that module.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading progress report…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Student progress
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Module quiz scores, completion, and weak knowledge areas (below 70%). Assign a
            retake to unlock a fresh AI quiz.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              filter === "all"
                ? "bg-[var(--color-accent)] text-[#05080f]"
                : "border border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("weak")}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              filter === "weak"
                ? "bg-[var(--color-accent)] text-[#05080f]"
                : "border border-[var(--color-border)] text-[var(--color-muted)]",
            )}
          >
            Weak only
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {msg ? <p className="mt-4 text-sm text-emerald-300">{msg}</p> : null}

      <div className="mt-6 space-y-4">
        {visible.map((s) => (
          <article
            key={s.studentId}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-[var(--color-text)]">{s.fullName}</h2>
                <p className="text-xs text-[var(--color-muted)]">
                  {s.email}
                  {s.batchCode ? ` · ${s.batchCode}` : ""}
                </p>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                Completed {s.completedCount}/{modules.length || s.modules.length} modules
              </p>
            </div>

            {s.weakModules.length > 0 ? (
              <p className="mt-2 text-xs text-amber-200/90">
                Weak modules: {s.weakModules.join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-emerald-200/80">No weak quiz scores recorded.</p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[var(--color-muted)]">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Module</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Score</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {s.modules.map((m) => {
                    const key = `${s.studentId}:${m.moduleId}`;
                    return (
                      <tr
                        key={m.moduleId}
                        className={clsx(
                          "border-t border-[var(--color-border)]/60",
                          m.weak && "bg-amber-500/5",
                        )}
                      >
                        <td className="py-2 pr-3 text-[var(--color-text)]">
                          {m.sortOrder}. {m.title}
                        </td>
                        <td className="py-2 pr-3 text-[var(--color-muted)]">
                          {m.status ?? "not started"}
                        </td>
                        <td className="py-2 pr-3 text-[var(--color-text)]">
                          {m.quizScore === null ? "—" : `${m.quizScore}%`}
                          {m.weak ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                              Weak
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2">
                          {m.weak || (m.quizScore !== null && m.status !== "completed") ? (
                            <button
                              type="button"
                              disabled={busyKey === key}
                              onClick={() => void assignRetake(s.studentId, m.moduleId)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 font-semibold text-[var(--color-accent)] disabled:opacity-50"
                            >
                              {busyKey === key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Assign retake
                            </button>
                          ) : (
                            <span className="text-[var(--color-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        ))}

        {!visible.length ? (
          <p className="text-sm text-[var(--color-muted)]">No students match this filter.</p>
        ) : null}
      </div>
    </main>
  );
}
