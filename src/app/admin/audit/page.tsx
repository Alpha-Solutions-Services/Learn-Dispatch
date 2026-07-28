import { redirect } from "next/navigation";
import { isPortalStaff } from "@/lib/admin-auth";
import { getPortalUser } from "@/lib/portal/auth";
import { AdminAuditClient } from "@/components/admin/AdminAuditClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const user = await getPortalUser();
  if (!user) redirect("/login?role=admin");
  if (!(await isPortalStaff(user))) redirect("/");

  return (
    <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:p-8">
      <AdminAuditClient />
    </div>
  );
}
