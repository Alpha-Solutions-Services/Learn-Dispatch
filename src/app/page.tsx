import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PLAN_PRICING } from "@/lib/academy/pricing";

export const metadata: Metadata = {
  title: "Learn Dispatch — Truck Dispatcher Training",
  description:
    "Online freight dispatch training. PKR 20,000/month or PKR 34,000 for a 2-month course bundle. Pay via NayaPay.",
};

const included = [
  "Recorded lectures you can watch on your schedule",
  "Load board fundamentals and follow-up discipline",
  "Rate negotiation framing for real dispatch desks",
  "Dispatch workflows from booking through delivery paperwork",
  "Compliance touchpoints carriers cannot ignore",
  "Templates and checklists for daily operations",
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Image
              src="/alpha-logo.png"
              alt="Alpha Solutions"
              width={56}
              height={56}
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-[var(--color-border)]"
              priority
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Learn Dispatch · Alpha Solutions
          </p>
          <h1
            className="mt-3 text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Dispatch training course
          </h1>
          <p className="mt-4 text-lg text-[var(--color-muted)]">
            Learn professional freight dispatching online — structured modules with recorded lectures.
          </p>
          <div className="mt-8 flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {PLAN_PRICING.lifetime.amountDisplay}
              </p>
              <p className="text-sm text-[var(--color-muted)]">2-month course bundle</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--color-accent)]">
                {PLAN_PRICING.monthly.amountDisplay}
              </p>
              <p className="text-sm text-[var(--color-muted)]">per month</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/enroll"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-8 py-3 text-sm font-semibold text-[#05080f]"
            >
              Enroll now
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-8 py-3 text-sm font-semibold text-[var(--color-text)]"
            >
              Student login
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 lg:px-8">
        <section>
          <h2 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
            What&apos;s included
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-[var(--color-muted)]">
            {included.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/30 p-8">
          <h2 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
            How payment works
          </h2>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-[var(--color-muted)]">
            <li>Choose monthly or 2-month bundle and create your account.</li>
            <li>Send payment via NayaPay to <strong className="text-[var(--color-text)]">0321 711 2944</strong>.</li>
            <li>Tap &quot;I have paid&quot; after sending — our team verifies and activates your dashboard.</li>
          </ol>
          <Link
            href="/enroll"
            className="mt-6 inline-flex rounded-lg bg-[var(--color-accent)] px-8 py-3 text-sm font-semibold text-[#05080f]"
          >
            Start enrollment
          </Link>
        </section>
      </div>
    </main>
  );
}
