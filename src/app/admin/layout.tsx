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

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin/enrollments", label: "Payments", icon: GraduationCap },
  { href: "/admin/inbox", label: "Student chat", icon: MessageCircle },
  { href: "/admin/assistant", label: "AI assist", icon: Sparkles },
  { href: "/admin/quizzes", label: "Assign quizzes", icon: ClipboardList },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
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
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
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
            <span className="ml-2 hidden text-[var(--color-muted)] sm:inline">{user.email}</span>
            <Link href="/login?role=instructor" className="ml-1 text-[var(--color-muted)] hover:text-[var(--color-text)]">
              Switch
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
