import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
      <header className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Learn Dispatch
            </p>
            <h1 className="text-sm font-semibold text-[var(--color-text)]">Instructor desk</h1>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/admin/enrollments"
              className="text-[var(--color-accent)] hover:underline"
            >
              Payment verification
            </Link>
            <span className="text-[var(--color-muted)]">{user.email}</span>
            <Link href="/login" className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
              Switch account
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
