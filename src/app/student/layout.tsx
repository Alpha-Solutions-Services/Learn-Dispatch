import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  MessageCircle,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/portal/LogoutButton";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/student/dashboard", label: "My learning", icon: LayoutDashboard },
  { href: "/student/messages", label: "Instructor chat", icon: MessageCircle },
  { href: "/student/assistant", label: "AI assistant", icon: Sparkles },
  { href: "/student/certificates", label: "Certificates", icon: BookOpen },
];

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
  // Allow layout chrome on unpaid only for dashboard redirects handled by pages;
  // messages/assistant require paid.
  const paid = isPaidAccessActive(access);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 0% 0%, rgba(56,163,255,0.12), transparent 50%), #05080f",
        }}
      />
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/student/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--color-accent)]" />
            <span className="text-sm font-semibold tracking-wide">Learn Dispatch Studio</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={paid || item.href === "/student/dashboard" ? item.href : "/enroll?reason=payment"}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:bg-white/5 hover:text-[var(--color-text)]"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] uppercase tracking-wider text-[var(--color-muted)] sm:inline">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-[var(--color-border)]/60 px-2 py-1 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={paid || item.href === "/student/dashboard" ? item.href : "/enroll?reason=payment"}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-[11px] text-[var(--color-muted)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
