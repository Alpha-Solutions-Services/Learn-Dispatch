"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { AcademyStudentRow } from "@/lib/academy/academy-db";

type Cert = {
  id: string;
  certificate_no: string;
  student_name: string;
  student_email: string;
  batch_code: string | null;
  modules_completed: number;
  issued_at: string;
};

export default function InstructorCertificatesClient() {
  const [students, setStudents] = useState<AcademyStudentRow[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/admin/students?status=paid"),
        fetch("/api/academy/certificates"),
      ]);
      const sBody = (await sRes.json()) as { students?: AcademyStudentRow[]; error?: string };
      const cBody = (await cRes.json()) as { certificates?: Cert[]; error?: string };
      if (!sRes.ok) throw new Error(sBody.error ?? "Students failed");
      if (!cRes.ok) throw new Error(cBody.error ?? "Certs failed");
      setStudents(sBody.students ?? []);
      setCerts(cBody.certificates ?? []);
      if (!studentId && sBody.students?.[0]) setStudentId(sBody.students[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [studentId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/academy/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Issue failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
        Certificates
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Issue a completion certificate (HTML download). Counts completed modules at issue time.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <label className="block text-xs text-[var(--color-muted)]">Paid student</label>
        <select
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName || s.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !studentId}
          onClick={() => void issue()}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#05080f] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Issue certificate
        </button>
      </div>

      <ul className="mt-8 space-y-3">
        {certs.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{c.student_name}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {c.certificate_no} · {c.modules_completed} modules ·{" "}
                {new Date(c.issued_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/academy/certificates?id=${c.id}&download=1`}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                View
              </a>
              <a
                href={`/api/academy/certificates?id=${c.id}&download=1&print=1`}
                className="text-xs font-semibold text-[var(--color-muted)] hover:underline"
              >
                Save PDF
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
