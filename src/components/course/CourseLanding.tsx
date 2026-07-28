"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Map,
  Radio,
  Shield,
  Truck,
} from "lucide-react";
import {
  COURSE,
  COURSE_MODULES,
  LEARNING_OUTCOMES,
} from "@/lib/course/curriculum";
import { PLAN_PRICING } from "@/lib/academy/pricing";

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function CourseLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,163,255,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 20%, rgba(91,200,255,0.08), transparent 50%), linear-gradient(180deg, #05080f 0%, #070d18 40%, #05080f 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(143,180,212,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(143,180,212,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(180deg, black, transparent 70%)",
        }}
      />

      <header className="border-b border-[var(--color-border)]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/alpha-logo.png"
              alt={COURSE.brand}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--color-border)]"
              priority
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide">{COURSE.product}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {COURSE.brand}
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)] sm:inline"
            >
              Student login
            </Link>
            <Link
              href="/login?role=instructor"
              className="hidden rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)] md:inline"
            >
              Instructor
            </Link>
            <Link
              href="/enroll"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#05080f] shadow-[var(--glow-sm)]"
            >
              Enroll
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="relative px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            {...fade}
            transition={{ duration: 0.55 }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              {COURSE.brand} · Education
            </p>
            <h1
              className="mt-4 text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              {COURSE.product}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-chrome)] sm:text-xl">
              {COURSE.title}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
              {COURSE.tagline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/enroll"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-8 py-3.5 text-sm font-bold text-[#05080f] shadow-[var(--glow-md)] transition hover:opacity-95"
              >
                Start enrollment
              </Link>
              <a
                href="#syllabus"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-6 py-3.5 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                View syllabus
              </a>
            </div>
            <p className="mt-5 text-xs text-[var(--color-muted)]">
              Course author · {COURSE.author} · {COURSE.durationLabel}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="mt-12 grid max-w-3xl gap-6 border-t border-[var(--color-border)] pt-8 sm:grid-cols-2"
          >
            <div>
              <p className="text-3xl font-bold text-[var(--color-accent)] sm:text-4xl">
                {PLAN_PRICING.lifetime.amountDisplay}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                2-month course bundle · one-time
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--color-accent)] sm:text-4xl">
                {PLAN_PRICING.monthly.amountDisplay}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Monthly access · cancel anytime after cycle
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/25 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl font-bold sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you will be able to do
          </motion.h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Built from the Alpha Freight Network truck dispatch course used to train desk operators.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {LEARNING_OUTCOMES.map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 text-sm leading-relaxed text-[var(--color-chrome)]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                {line}
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-2xl font-bold sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Desk-ready skills
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Map, title: "Geography first", body: "Regions, time zones, and lane sense before you touch a board." },
              { icon: Truck, title: "Equipment fluency", body: "Box, van, reefer, flatbed, hotshot, and power-only realities." },
              { icon: FileText, title: "Paperwork discipline", body: "MC, COI, RC, BOL, POD — and when money can change after booking." },
              { icon: Radio, title: "Boards & abbreviations", body: "DAT posting codes, VoIP desks, and the language brokers use." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="border-l border-[var(--color-accent)]/40 pl-4">
                <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                <h3 className="mt-3 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Syllabus */}
      <section
        id="syllabus"
        className="scroll-mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface)]/20 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <BookOpen className="h-7 w-7 text-[var(--color-accent)]" />
                Course syllabus
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {COURSE_MODULES.length} modules · recorded lectures unlock after payment verification
              </p>
            </div>
            <Link
              href="/enroll"
              className="text-sm font-semibold text-[var(--color-accent)] hover:underline"
            >
              Enroll to unlock studio →
            </Link>
          </div>

          <ol className="mt-10 space-y-3">
            {COURSE_MODULES.map((m) => (
              <li
                key={m.order}
                className="grid gap-2 border-b border-[var(--color-border)]/80 py-4 sm:grid-cols-[3rem_1fr] sm:gap-6"
              >
                <span className="font-mono text-sm text-[var(--color-accent)]">
                  {String(m.order).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text)]">{m.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{m.summary}</p>
                  <p className="mt-2 text-xs text-[var(--color-chrome)]">
                    {m.topics.join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust / payment */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2
                className="flex items-center gap-2 text-2xl font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <Shield className="h-6 w-6 text-[var(--color-accent)]" />
                How access works
              </h2>
              <ol className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--color-muted)]">
                <li>
                  <strong className="text-[var(--color-text)]">1. Enroll</strong> — create your student account and choose monthly or the 2-month bundle.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">2. Pay via NayaPay</strong> — send to{" "}
                  <span className="font-semibold text-[var(--color-accent)]">0321 711 2944</span> with your full name in the note.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">3. We verify</strong> — tap “I have paid,” then our instructors confirm the transfer and unlock your studio.
                </li>
              </ol>
              <p className="mt-6 text-xs text-[var(--color-muted)]">
                Educational training only — not legal or financial advice. Motor carriers remain responsible for FMCSA compliance.
              </p>
            </div>
            <div className="flex flex-col justify-center border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Ready when you are
              </p>
              <p className="mt-3 text-lg text-[var(--color-text)]">
                Join the Alpha Freight Network dispatch desk curriculum.
              </p>
              <Link
                href="/enroll"
                className="mt-6 inline-flex w-fit rounded-lg bg-[var(--color-accent)] px-8 py-3 text-sm font-bold text-[#05080f]"
              >
                Enroll now
              </Link>
              <a
                href={COURSE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-sm text-[var(--color-accent)] hover:underline"
              >
                Questions? WhatsApp us
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/alpha-logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover"
            />
            <div>
              <p className="text-sm font-semibold">{COURSE.brand}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {COURSE.product} · {COURSE.author}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-muted)]">
            <a href={`mailto:${COURSE.supportEmail}`} className="hover:text-[var(--color-accent)]">
              {COURSE.supportEmail}
            </a>
            <Link href="/login" className="hover:text-[var(--color-accent)]">
              Student login
            </Link>
            <Link href="/login?role=instructor" className="hover:text-[var(--color-accent)]">
              Instructor
            </Link>
            <span>learndispatch.alphasolutions.software</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
