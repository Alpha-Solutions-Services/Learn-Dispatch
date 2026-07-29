"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  NAYAPAY,
  PLAN_PRICING,
  planAmountDisplay,
  type EnrollmentPlan,
} from "@/lib/academy/pricing";

const WHATSAPP = "https://wa.me/923494206922";
const SUPPORT = "info@alphasolutions.software";

const bundleFeatures = [
  "All 12 Alpha Freight Network course modules",
  "US map, equipment, docs, RC/BOL/POD & load boards",
  "2 months of studio access · instructor progress notes",
  "Built from the finalized truck dispatch course deck",
];

const monthlyFeatures = [
  "Rolling access to the full AFN syllabus",
  "Equipment, paperwork, boards & abbreviations",
  "Business-day email / WhatsApp support",
];

export default function StudentEnroll({
  initialReason,
  resumeAccount = false,
}: {
  initialReason?: string;
  resumeAccount?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(resumeAccount ? 2 : 1);
  const [plan, setPlan] = useState<EnrollmentPlan>("lifetime");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [oauthUserId, setOauthUserId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkExistingAccount, setLinkExistingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [challanNo, setChallanNo] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    void (async () => {
      const sb = createClient();
      if (!sb) {
        setBootstrapping(false);
        return;
      }
      const { data } = await sb.auth.getUser();
      const u = data.user;
      if (u?.id) {
        setOauthUserId(u.id);
        if (u.email) setEmail(u.email);
        const metaName =
          (typeof u.user_metadata?.full_name === "string" && u.user_metadata.full_name) ||
          (typeof u.user_metadata?.name === "string" && u.user_metadata.name) ||
          "";
        if (metaName) setName((prev) => prev || metaName);

        const { data: profile } = await sb
          .from("profiles")
          .select("role, enrollment_status, enrollment_plan, full_name, whatsapp_phone")
          .eq("id", u.id)
          .maybeSingle();

        if (profile?.role === "student" && profile.enrollment_status === "paid") {
          router.replace("/student/dashboard?welcome=1");
          return;
        }

        if (profile?.full_name) setName(profile.full_name as string);
        if (profile?.whatsapp_phone) setWhatsapp(profile.whatsapp_phone as string);
        if (profile?.enrollment_plan === "monthly" || profile?.enrollment_plan === "lifetime") {
          setPlan(profile.enrollment_plan);
        }

        // Unpaid / pending student after Google → Continue payment (not plan start).
        if (
          profile?.role === "student" &&
          (profile.enrollment_status === "pending" ||
            profile.enrollment_status === "unpaid" ||
            initialReason === "payment")
        ) {
          setSubmitted(true);
          setClaimed(profile.enrollment_status === "pending");
          setBootstrapping(false);
          return;
        }

        setStep(2);
      } else if (resumeAccount) {
        setStep(2);
      }
      setBootstrapping(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validateAndContinue() {
    setFormErr(null);
    const phone = whatsapp.replace(/[\s-]/g, "");
    if (phone.length < 10) {
      setFormErr("Enter a valid WhatsApp number (with country code, e.g. 92300…).");
      return;
    }
    if (!oauthUserId) {
      if (password !== confirm || password.length < 8) {
        setFormErr("Passwords must match and be at least 8 characters.");
        return;
      }
    }
    try {
      if (oauthUserId) {
        setStep(3);
        return;
      }
      const res = await fetch("/api/academy/check-student-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormErr(typeof data.error === "string" ? data.error : "Could not validate email.");
        return;
      }
      setLinkExistingAccount(Boolean(data.exists));
      setStep(3);
    } catch {
      setFormErr("Could not validate email.");
    }
  }

  async function signInWithGoogle() {
    setFormErr(null);
    setGoogleLoading(true);
    try {
      const sb = createClient();
      if (!sb) {
        setFormErr("Google sign-in is not configured.");
        return;
      }
      // Resume account/payment after Google — not enroll start (plan picker).
      document.cookie = `ld_oauth_next=${encodeURIComponent("/enroll?continue=account")}; Path=/; Max-Age=600; SameSite=Lax`;
      document.cookie = `ld_oauth_role=student; Path=/; Max-Age=600; SameSite=Lax`;
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        setFormErr(
          `${oauthError.message} — add ${redirectTo} in Supabase → Authentication → Redirect URLs (not the portal URL).`,
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function submitEnrollment() {
    setSubmitting(true);
    setFormErr(null);
    try {
      const endpoint =
        oauthUserId || linkExistingAccount
          ? "/api/academy/complete-enrollment-existing"
          : "/api/academy/complete-enrollment";
      const body =
        oauthUserId || linkExistingAccount
          ? { plan, name, email, whatsapp: whatsapp.replace(/[\s-]/g, "") }
          : { plan, name, email, password, whatsapp: whatsapp.replace(/[\s-]/g, "") };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Enrollment failed");
      }

      if (!oauthUserId && password) {
        const supabase = createClient();
        if (supabase) await supabase.auth.signInWithPassword({ email, password });
      }

      setChallanNo(typeof json.challanNo === "string" ? json.challanNo : null);
      setSubmitted(true);
      // Stay on Continue payment — not marketing start or empty studio.
      router.replace("/enroll?reason=payment");
      router.refresh();
    } catch (ex: unknown) {
      setFormErr(ex instanceof Error ? ex.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsPaid() {
    setClaiming(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/academy/claim-payment", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not record payment");
      setClaimed(true);
    } catch (ex: unknown) {
      setFormErr(ex instanceof Error ? ex.message : "Could not record payment");
    } finally {
      setClaiming(false);
    }
  }

  const paymentInstructions = (
    <div className="mt-6 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 p-4 text-left text-sm text-[var(--color-muted)]">
      <p>
        Send <strong className="text-[var(--color-text)]">{PLAN_PRICING[plan].amountDisplay}</strong> via{" "}
        <strong className="text-[var(--color-text)]">NayaPay</strong> to the company account:
      </p>
      <p className="font-semibold text-[var(--color-text)]">{NAYAPAY.accountTitle}</p>
      <p className="text-lg font-bold tracking-wide text-[var(--color-accent)]">{NAYAPAY.accountDisplay}</p>
      <p className="text-xs">NayaPay ID: {NAYAPAY.id}</p>
      <p className="text-xs">IBAN: {NAYAPAY.iban}</p>
      <p>
        Use your <strong className="text-[var(--color-text)]">full name</strong> + challan number in
        the transfer note. Fees are <strong className="text-[var(--color-text)]">non-refundable</strong>.
      </p>
    </div>
  );

  if (bootstrapping) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-[var(--color-muted)]">
        Preparing your enrollment…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-[var(--color-accent)]" />
        <h1
          className="mt-4 text-3xl font-bold text-[var(--color-text)]"
          style={{ fontFamily: "var(--font-display), sans-serif" }}
        >
          {submitted ? "Continue payment" : "Enroll in Learn Dispatch"}
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
          {submitted
            ? "Send NayaPay, then mark as paid so your instructor can verify and unlock the studio."
            : "Alpha Freight Network truck dispatcher training — pay via NayaPay. Instructors verify every payment before unlocking the studio."}
        </p>
      </div>

      {initialReason === "payment" ? (
        <p className="mb-10 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
          Complete payment to unlock course materials. Send via NayaPay, then tap &quot;I have paid&quot; so we can verify.
        </p>
      ) : null}

      {submitted ? (
        <div className="mx-auto max-w-lg rounded-3xl border border-emerald-500/30 bg-[var(--color-surface)]/40 px-8 py-10 text-center">
          <h3 className="text-lg font-bold text-[var(--color-text)]">Enrollment submitted</h3>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Your account is ready. Pay <strong className="text-[var(--color-text)]">{planAmountDisplay(plan)}</strong> via NayaPay, then mark as paid below. Our team will verify and activate your dashboard.
          </p>
          {paymentInstructions}
          {challanNo ? (
            <p className="mt-3 text-xs text-[var(--color-chrome)]">
              Challan: <strong className="text-[var(--color-text)]">{challanNo}</strong>
            </p>
          ) : null}
          <a
            href="/api/academy/challan"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-accent)]/40 px-6 py-3 text-sm font-semibold text-[var(--color-accent)]"
          >
            Download fee challan
          </a>
          {formErr ? <p className="mt-4 text-sm text-red-200">{formErr}</p> : null}
          <button
            type="button"
            disabled={claiming || claimed}
            onClick={() => void markAsPaid()}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[#05080f] disabled:opacity-50"
          >
            {claimed ? "Payment marked — awaiting verification" : claiming ? "Saving…" : "I have paid via NayaPay"}
          </button>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-border)] px-6 py-3 text-sm font-semibold text-[var(--color-text)]"
          >
            Send receipt on WhatsApp
          </a>
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            Questions? Email {SUPPORT}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <span className={step === 1 ? "text-[var(--color-accent)]" : undefined}>Plan</span>
            <span>·</span>
            <span className={step === 2 ? "text-[var(--color-accent)]" : undefined}>Account</span>
            <span>·</span>
            <span className={step === 3 ? "text-[var(--color-accent)]" : undefined}>Payment</span>
          </div>

          {step === 1 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className={`rounded-2xl border p-8 text-left ${
                  plan === "monthly"
                    ? "border-[var(--color-accent)]/80 bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]/35"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Flexible</p>
                <h2 className="mt-4 text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
                  Monthly Access
                </h2>
                <p className="mt-2 text-2xl font-bold text-[var(--color-accent)]">
                  {PLAN_PRICING.monthly.amountDisplay}
                  <span className="text-sm font-normal text-[var(--color-muted)]">/month</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-[var(--color-muted)]">
                  {monthlyFeatures.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </button>
              <button
                type="button"
                onClick={() => setPlan("lifetime")}
                className={`relative rounded-2xl border p-8 text-left ${
                  plan === "lifetime"
                    ? "border-[var(--color-accent)] shadow-[var(--glow-md)] bg-[radial-gradient(circle_at_top,_rgba(56,163,255,0.3),transparent_60%)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]/35"
                }`}
              >
                <span className="absolute right-6 top-5 rounded-full bg-[var(--color-accent)] px-3 py-0.5 text-[11px] font-bold uppercase text-[#05080f]">
                  Best value
                </span>
                <BadgeCheck className="h-7 w-7 text-[var(--color-accent)]" />
                <h2 className="mt-4 text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
                  2-Month Course Bundle
                </h2>
                <p className="mt-2 text-3xl font-bold text-[var(--color-accent)]">
                  {PLAN_PRICING.lifetime.amountDisplay}
                  <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
                    one-time · 2 months access
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-[var(--color-text)]">
                  {bundleFeatures.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-10 flex flex-col items-center gap-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex min-w-[260px] items-center justify-center rounded-lg bg-[var(--color-accent)] px-10 py-3 text-sm font-bold text-[#05080f]"
              >
                Continue with selected plan →
              </button>
              <Link href="/" className="text-sm text-[var(--color-accent)] underline">
                View course overview
              </Link>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-8 py-10">
              {formErr ? <p className="text-sm text-red-200">{formErr}</p> : null}
              {!oauthUserId ? (
                <>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    disabled={googleLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50"
                  >
                    {googleLoading ? "Redirecting…" : "Continue with Google"}
                  </button>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                    or create a password
                    <span className="h-px flex-1 bg-[var(--color-border)]" />
                  </div>
                </>
              ) : (
                <p className="text-center text-xs text-[var(--color-muted)]">
                  Signed in with Google. Continue to payment on the next step.
                </p>
              )}
              <label className="block text-xs text-[var(--color-muted)]">Full name</label>
              <input
                required
                className="w-full rounded-lg border border-[var(--color-border)] bg-[#050912] px-3 py-2 text-[var(--color-text)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="block text-xs text-[var(--color-muted)]">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[#050912] px-3 py-2 text-[var(--color-text)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className="block text-xs text-[var(--color-muted)]">
                WhatsApp number (with country code)
              </label>
              <input
                required
                type="tel"
                placeholder="923001234567"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[#050912] px-3 py-2 text-[var(--color-text)]"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <p className="text-[10px] text-[var(--color-muted)]">
                Required for monthly batch follow-up (Google sign-up included).
              </p>
              {!oauthUserId ? (
                <>
                  <label className="block text-xs text-[var(--color-muted)]">Password · min 8 characters</label>
                  <input
                    required
                    type="password"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[#050912] px-3 py-2 text-[var(--color-text)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label className="block text-xs text-[var(--color-muted)]">Confirm password</label>
                  <input
                    required
                    type="password"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[#050912] px-3 py-2 text-[var(--color-text)]"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </>
              ) : null}
              <button type="button" onClick={() => setStep(1)} className="text-xs text-[var(--color-muted)] underline">
                ← Adjust plan
              </button>
              <button
                type="button"
                onClick={() => void validateAndContinue()}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] py-3 text-sm font-semibold text-[#05080f]"
              >
                Continue to payment
              </button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-[var(--color-accent)]/30 bg-[#071021] px-8 py-10">
              <h3 className="text-lg font-bold text-[var(--color-text)]">
                Payment — {planAmountDisplay(plan)}
              </h3>
              <p className="mt-3 text-sm text-[var(--color-muted)]">
                Submit enrollment first, then send payment via NayaPay. After paying, tap &quot;I have paid&quot; on the next screen. Our team verifies every payment before activating access.
              </p>
              {paymentInstructions}
              {formErr ? <p className="mt-4 text-sm text-red-200">{formErr}</p> : null}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitEnrollment()}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] py-3 text-sm font-bold text-[#05080f] disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit enrollment"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
