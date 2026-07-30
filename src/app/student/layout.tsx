import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/portal/LogoutButton";
import { StudentMobileBottomNav } from "@/components/layout/StudentMobileBottomNav";

export const dynamic = "force-dynamic";

const nav = [
  {
    href: "/student/dashboard",
    label: "Learn",
    desktopLabel: "My learning",
    icon: LayoutDashboard,
    iconKey: "learn",
    match: ["/student/dashboard", "/student/modules"],
  },
  {
    href: "/student/live",
    label: "Live",
    desktopLabel: "Live sessions",
    icon: Video,
    iconKey: "live",
    match: ["/student/live"],
  },
  {
    href: "/student/messages",
    label: "Chat",
    desktopLabel: "Instructor chat",
    icon: MessageCircle,
    iconKey: "chat",
    match: ["/student/messages"],
  },
  {
    href: "/student/assistant",
    label: "Assist",
    desktopLabel: "AI assistant",
    icon: Sparkles,
    iconKey: "assist",
    match: ["/student/assistant"],
  },
  {
    href: "/student/certificates",
    label: "Certs",
    desktopLabel: "Certificates",
    icon: Award,
    iconKey: "certs",
    match: ["/student/certificates"],
  },
] as const;

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  const paid = isPaidAccessActive(access);

  function hrefFor(itemHref: string) {
    return paid || itemHref === "/student/dashboard"
      ? itemHref
      : "/enroll?reason=payment";
  }

  const dockItems = nav.map((item) => ({
    href: hrefFor(item.href),
    label: item.label,
    icon: item.iconKey,
    match: [...item.match],
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 0% 0%, rgba(56,163,255,0.12), transparent 50%), #05080f",
        }}
      />

      <header className="sticky top-0 z-30 hidden shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/student/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/30">
              <BookOpen className="h-4 w-4 text-[var(--color-accent)]" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                Learn Dispatch
              </p>
              <p className="text-sm font-semibold tracking-wide">Studio</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 rounded-2xl border border-[var(--color-border)]/80 bg-white/[0.03] p-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:bg-white/5 hover:text-[var(--color-text)]"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.desktopLabel}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-[10px] uppercase tracking-wider text-[var(--color-muted)] lg:inline">
              {user.email}
            </span>
            <div className="w-auto [&_button]:w-auto [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs">
              <LogoutButton redirectTo="/login" />
            </div>
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/25">
              <BookOpen className="h-4 w-4 text-[var(--color-accent)]" />
            </span>
            <span className="text-sm font-semibold tracking-wide">
              Learn Dispatch
            </span>
          </Link>
          <div className="shrink-0 [&_button]:w-auto [&_button]:rounded-lg [&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-[11px]">
            <LogoutButton redirectTo="/login" />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>

      <StudentMobileBottomNav items={dockItems} />
    </div>
  );
}
