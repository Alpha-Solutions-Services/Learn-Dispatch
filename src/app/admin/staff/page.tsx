import { redirect } from "next/navigation";
import { isOwnerUserAsync, isPortalStaff } from "@/lib/admin-auth";
import { getPortalUser } from "@/lib/portal/auth";
import { AdminUsersPageClient } from "@/components/admin/AdminUsersPageClient";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getPortalUser();
  if (!user) redirect("/login?role=admin");
  if (!(await isPortalStaff(user))) redirect("/");
  if (!(await isOwnerUserAsync(user))) redirect("/admin");

  return (
    <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:p-8">
      <AdminUsersPageClient />
    </div>
  );
}
