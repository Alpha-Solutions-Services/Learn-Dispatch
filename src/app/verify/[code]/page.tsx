import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { computeCertificateHash } from "@/lib/academy/certificate";
import { COURSE } from "@/lib/course/curriculum";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }> | { code: string };
};

async function resolveCode(params: PageProps["params"]) {
  const { code } =
    typeof (params as Promise<{ code: string }>).then === "function"
      ? await (params as Promise<{ code: string }>)
      : (params as { code: string });
  return decodeURIComponent(code).trim().toUpperCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const code = await resolveCode(params);
  return { title: `Verify ${code} — Learn Dispatch` };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const code = await resolveCode(params);

  const admin = getServiceRoleClient();
  if (!admin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
          {COURSE.brand} · Certificate verification
        </p>
        <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 text-xl font-bold text-[var(--color-text)]">Verification unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            The verification service is temporarily misconfigured. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const { data: cert, error } = await admin
    .from("academy_certificates")
    .select(
      "certificate_no,student_name,student_email,batch_code,modules_completed,issued_at,integrity_hash",
    )
    .ilike("certificate_no", code)
    .maybeSingle();

  if (error) {
    console.error("[verify]", code, error.message);
  }

  // Registry match is the source of truth. Hash is a secondary integrity check
  // (normalized issued_at so Postgres vs ISO string formats do not false-fail).
  let hashOk = false;
  if (cert) {
    const recomputed = computeCertificateHash({
      certificate_no: cert.certificate_no as string,
      student_email: cert.student_email as string,
      student_name: cert.student_name as string,
      modules_completed: Number(cert.modules_completed) || 0,
      issued_at: cert.issued_at as string,
    });
    const stored = (cert.integrity_hash as string | null)?.trim().toUpperCase() || "";
    hashOk = !stored || stored === recomputed;
  }

  const valid = Boolean(cert);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
        {COURSE.brand} · Certificate verification
      </p>
      <div className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 text-center">
        {valid ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h1 className="mt-4 text-xl font-bold text-[var(--color-text)]">Certificate valid</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Issued to <strong className="text-[var(--color-text)]">{cert!.student_name as string}</strong>
            </p>
            {!hashOk ? (
              <p className="mt-2 text-xs text-amber-300/90">
                Record found in the Learn Dispatch registry. Audit hash could not be re-validated
                (signing secret may have changed since issue).
              </p>
            ) : null}
            <dl className="mt-6 space-y-2 text-left text-sm text-[var(--color-muted)]">
              <div className="flex justify-between gap-4">
                <dt>Certificate</dt>
                <dd className="font-mono text-[var(--color-text)]">{cert!.certificate_no as string}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Modules completed</dt>
                <dd className="text-[var(--color-text)]">{String(cert!.modules_completed)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Batch</dt>
                <dd className="text-[var(--color-text)]">{(cert!.batch_code as string) || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Issued</dt>
                <dd className="text-[var(--color-text)]">
                  {new Date(cert!.issued_at as string).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Program</dt>
                <dd className="text-right text-[var(--color-text)]">{COURSE.credentialLine}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-400" />
            <h1 className="mt-4 text-xl font-bold text-[var(--color-text)]">Not verified</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              No matching Learn Dispatch certificate for{" "}
              <span className="font-mono text-[var(--color-text)]">{code || "—"}</span>.
            </p>
          </>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Alpha Solutions Services LLC · Alpha Freight Network ·{" "}
        <Link href="/" className="text-[var(--color-accent)]">
          Learn Dispatch
        </Link>
      </p>
    </main>
  );
}
