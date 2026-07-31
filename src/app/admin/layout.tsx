import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BarChart3,
  ClipboardList,
  GraduationCap,
  MessageCircle,
  Sparkles,
  Video,
} from "lucide-react";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/portal/LogoutButton";
import { StudentMobileBottomNav } from "@/components/layout/StudentMobileBottomNav";

export const dynamic = "force-dynamic";

const links = [
  {
    href: "/admin/enrollments",
    label: "Payments",
    short: "Pay",
    icon: GraduationCap,
    iconKey: "pay",
    match: ["/admin/enrollments"],
  },
  {
    href: "/admin/live",
    label: "Live sessions",
    short: "Live",
    icon: Video,
    iconKey: "live",
    match: ["/admin/live"],
  },
  {
    href: "/admin/inbox",
    label: "Student messages",
    short: "Chat",
    icon: MessageCircle,
    iconKey: "chat",
    match: ["/admin/inbox"],
  },
  {
    href: "/admin/assistant",
    label: "AI assistant",
    short: "Assist",
    icon: Sparkles,
    iconKey: "assist",
    match: ["/admin/assistant"],
  },
  {
    href: "/admin/progress",
    label: "Progress",
    short: "Prog",
    icon: BarChart3,
    iconKey: "progress",
    match: ["/admin/progress"],
  },
  {
    href: "/admin/quizzes",
    label: "Assign quizzes",
    short: "Quiz",
    icon: ClipboardList,
    iconKey: "quiz",
    match: ["/admin/quizzes"],
  },
  {
    href: "/admin/certificates",
    label: "Certificates",
    short: "Certs",
    icon: Award,
    iconKey: "certs",
    match: ["/admin/certificates"],
  },
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
  if (!(await canManageAcademy(user))) {
    redirect("/login?role=instructor&error=unauthorized");
  }

  const dockItems = links.map((item) => ({
    href: item.href,
    label: item.short,
    icon: item.iconKey,
    match: item.match,
  }));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 hidden shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Learn Dispatch
            </p>
            <h1 className="text-sm font-semibold text-[var(--color-text)]">
              Instructor desk
            </h1>
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

      <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-md md:hidden">
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

      <div className="min-h-0 flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>

      <StudentMobileBottomNav items={dockItems} />
    </div>
  );
}
