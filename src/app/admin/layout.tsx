import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/portal/LogoutButton";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin/enrollments", label: "Payments", short: "Pay", icon: GraduationCap },
  { href: "/admin/inbox", label: "Student messages", short: "Chat", icon: MessageCircle },
  { href: "/admin/assistant", label: "AI assistant", short: "Assist", icon: Sparkles },
  { href: "/admin/quizzes", label: "Assign quizzes", short: "Quiz", icon: ClipboardList },
  { href: "/admin/certificates", label: "Certificates", short: "Certs", icon: Award },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (!user?.id) redirect("/login?role=instructor");
  if (!(await canManageAcademy(user))) redirect("/login?role=instructor&error=unauthorized");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Desktop / tablet top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Learn Dispatch
            </p>
            <h1 className="text-sm font-semibold text-[var(--color-text)]">Instructor desk</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[var(--color-muted)] transition hover:bg-white/5 hover:text-[var(--color-accent)]"
              >
                <l.icon className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            ))}
            <span className="ml-2 hidden max-w-[160px] truncate text-[var(--color-muted)] lg:inline">
              {user.email}
            </span>
            <div className="ml-1 [&_button]:w-auto [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs">
              <LogoutButton redirectTo="/login?role=instructor" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile top brand strip */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Learn Dispatch
            </p>
            <p className="truncate text-sm font-semibold">Instructor desk</p>
          </div>
          <div className="shrink-0 [&_button]:w-auto [&_button]:rounded-lg [&_button]:px-2.5 [&_button]:py-1.5 [&_button]:text-[11px]">
            <LogoutButton redirectTo="/login?role=instructor" />
          </div>
        </div>
      </header>

      <div className="pb-24 md:pb-0">{children}</div>

      {/* Same premium mobile bottom dock as student studio */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-2 mb-2 rounded-2xl border border-[var(--color-border)] bg-[#0a101c]/95 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <ul className="grid grid-cols-5 gap-0.5 p-1.5">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex flex-col items-center gap-1 rounded-xl px-0.5 py-2.5 text-[var(--color-muted)] transition active:bg-[var(--color-accent)]/15 active:text-[var(--color-accent)]"
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-[9px] font-medium tracking-wide">{item.short}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}
