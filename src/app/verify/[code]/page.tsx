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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } =
    typeof (params as Promise<{ code: string }>).then === "function"
      ? await (params as Promise<{ code: string }>)
      : (params as { code: string });
  return { title: `Verify ${decodeURIComponent(code)} — Learn Dispatch` };
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code: raw } =
    typeof (params as Promise<{ code: string }>).then === "function"
      ? await (params as Promise<{ code: string }>)
      : (params as { code: string });
  const code = decodeURIComponent(raw).trim().toUpperCase();

  const admin = getServiceRoleClient();
  const { data: cert } = admin
    ? await admin
        .from("academy_certificates")
        .select(
          "certificate_no,student_name,student_email,batch_code,modules_completed,issued_at,integrity_hash",
        )
        .ilike("certificate_no", code)
        .maybeSingle()
    : { data: null };

  let hashOk = false;
  if (cert) {
    const expected =
      (cert.integrity_hash as string) ||
      computeCertificateHash({
        certificate_no: cert.certificate_no as string,
        student_email: cert.student_email as string,
        student_name: cert.student_name as string,
        modules_completed: (cert.modules_completed as number) ?? 0,
        issued_at: cert.issued_at as string,
      });
    const recomputed = computeCertificateHash({
      certificate_no: cert.certificate_no as string,
      student_email: cert.student_email as string,
      student_name: cert.student_name as string,
      modules_completed: (cert.modules_completed as number) ?? 0,
      issued_at: cert.issued_at as string,
    });
    hashOk = expected === recomputed || !cert.integrity_hash;
  }

  const valid = Boolean(cert) && hashOk;

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
            <dl className="mt-6 space-y-2 text-left text-sm text-[var(--color-muted)]">
              <div className="flex justify-between gap-4">
                <dt>Certificate</dt>
                <dd className="font-mono text-[var(--color-text)]">{cert!.certificate_no as string}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Modules</dt>
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
