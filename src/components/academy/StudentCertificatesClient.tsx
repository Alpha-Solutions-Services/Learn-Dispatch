"use client";

import { useEffect, useState } from "react";
import { Award, Loader2 } from "lucide-react";

type Cert = {
  id: string;
  certificate_no: string;
  modules_completed: number;
  issued_at: string;
  batch_code: string | null;
};

export default function StudentCertificatesClient() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/academy/certificates");
        const body = (await res.json()) as { certificates?: Cert[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Failed");
        setCerts(body.certificates ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1
        className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Award className="h-6 w-6 text-[var(--color-accent)]" />
        Certificates
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Certificates issued by your instructor appear here.
      </p>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {certs.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">No certificates yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {certs.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{c.certificate_no}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {c.modules_completed} modules · {new Date(c.issued_at).toLocaleDateString()}
                  {c.batch_code ? ` · ${c.batch_code}` : ""}
                </p>
              </div>
              <a
                href={`/api/academy/certificates?id=${c.id}&download=1`}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
