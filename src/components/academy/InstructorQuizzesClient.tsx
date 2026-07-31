"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { AcademyStudentRow } from "@/lib/academy/academy-db";
import type { StudentProgressReportRow } from "@/lib/academy/academy-db";

type ModuleRow = { id: string; title: string; sort_order: number };

export default function InstructorQuizzesClient() {
  const [students, setStudents] = useState<AcademyStudentRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [report, setReport] = useState<StudentProgressReportRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sRes, mRes, rRes] = await Promise.all([
        fetch("/api/admin/students?status=paid"),
        fetch("/api/academy/modules-list"),
        fetch("/api/academy/student-progress-report"),
      ]);
      const sBody = (await sRes.json()) as { students?: AcademyStudentRow[]; error?: string };
      const mBody = (await mRes.json()) as { modules?: ModuleRow[]; error?: string };
      const rBody = (await rRes.json()) as {
        students?: StudentProgressReportRow[];
        error?: string;
      };
      if (!sRes.ok) throw new Error(sBody.error ?? "Students failed");
      if (!mRes.ok) throw new Error(mBody.error ?? "Modules failed");
      setStudents(sBody.students ?? []);
      setModules(mBody.modules ?? []);
      setReport(rBody.students ?? []);
      if (!studentId && sBody.students?.[0]) setStudentId(sBody.students[0].id);
      if (!moduleId && mBody.modules?.[0]) setModuleId(mBody.modules[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [moduleId, studentId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedReport = useMemo(
    () => report.find((r) => r.studentId === studentId) ?? null,
    [report, studentId],
  );

  const selectedModuleScore = useMemo(() => {
    if (!selectedReport) return null;
    return selectedReport.modules.find((m) => m.moduleId === moduleId) ?? null;
  }, [selectedReport, moduleId]);

  async function assign() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/academy/quiz-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, moduleId, note: note || undefined }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Assign failed");
      setMsg(
        "Retake unlocked. Student gets a new AI-generated 5-question quiz on that module.",
      );
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1
        className="text-2xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Assign quiz retake
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Each attempt is a fresh AI set of 5 MCQs. After a fail (&lt;70%), students are locked
        until you assign a retake. See{" "}
        <a href="/admin/progress" className="text-[var(--color-accent)] underline">
          Student progress
        </a>{" "}
        for weak modules.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}

        <label className="block text-xs text-[var(--color-muted)]">Student</label>
        <select
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          {students.map((s) => {
            const weak = report.find((r) => r.studentId === s.id)?.weakModules.length ?? 0;
            return (
              <option key={s.id} value={s.id}>
                {s.fullName || s.email}
                {s.batchCode ? ` (${s.batchCode})` : ""}
                {weak ? ` · ${weak} weak` : ""}
              </option>
            );
          })}
        </select>

        <label className="block text-xs text-[var(--color-muted)]">Module</label>
        <select
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.sort_order}. {m.title}
            </option>
          ))}
        </select>

        {selectedModuleScore ? (
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-3 py-2 text-xs text-[var(--color-muted)]">
            Last score:{" "}
            <span className="font-semibold text-[var(--color-text)]">
              {selectedModuleScore.quizScore === null
                ? "—"
                : `${selectedModuleScore.quizScore}%`}
            </span>
            {" · "}
            Status: {selectedModuleScore.status ?? "not started"}
            {selectedModuleScore.weak ? (
              <span className="ml-2 font-semibold uppercase tracking-wider text-amber-300">
                Weak
              </span>
            ) : null}
          </p>
        ) : null}

        {selectedReport?.weakModules?.length ? (
          <p className="text-xs text-amber-200/90">
            Weak for this student: {selectedReport.weakModules.join(", ")}
          </p>
        ) : null}

        <label className="block text-xs text-[var(--color-muted)]">Note (optional)</label>
        <input
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Review HOS section, then retake…"
        />

        <button
          type="button"
          disabled={busy || !studentId || !moduleId}
          onClick={() => void assign()}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#05080f] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Assign retake
        </button>
      </div>
    </main>
  );
}
