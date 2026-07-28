import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminEnrollments } from "@/components/academy/AdminEnrollments";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment verification — Learn Dispatch",
};

export default async function AdminEnrollmentsPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (!user?.id) redirect("/login?role=admin");
  if (!(await canManageAcademy(user))) redirect("/login?error=unauthorized");

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-4 sm:p-6 lg:p-8">
      <AdminEnrollments />
    </main>
  );
}
