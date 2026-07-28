import type { User } from "@supabase/supabase-js";
import { isAllowedAdminEmail, getAdminAllowlist } from "@/lib/admin-allowlist";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function normalize(email: string) {
  return email.trim().toLowerCase();
}

/** Admin allowlist, instructor, or dispatcher may manage academy enrollments. */
export async function canManageAcademy(user: User | null): Promise<boolean> {
  if (!user?.id) return false;

  const email = user.email ? normalize(user.email) : "";
  if (email && isAllowedAdminEmail(email)) return true;

  // Use service role — auth callback runs before session cookies are on the request,
  // so a user-scoped createClient() would fail RLS and wrongly deny instructors.
  const admin = getServiceRoleClient();
  if (!admin) return false;

  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = data?.role;
  if (role === "instructor" || role === "dispatcher") return true;

  // Also accept active portal_staff rows
  if (email) {
    const { data: staff } = await admin
      .from("portal_staff")
      .select("active")
      .ilike("email", email)
      .eq("active", true)
      .maybeSingle();
    if (staff) return true;
  }

  return false;
}

export async function requireAcademyStaff(user: User | null): Promise<
  | { ok: true; user: User }
  | { ok: false; status: number; message: string }
> {
  if (!user?.id) {
    return { ok: false, status: 401, message: "Sign in required" };
  }
  if (!(await canManageAcademy(user))) {
    return { ok: false, status: 403, message: "Staff only" };
  }
  return { ok: true, user };
}

/** Debug helper — which gate would pass for this user */
export async function academyAccessDebug(user: User | null) {
  const email = user?.email ? normalize(user.email) : null;
  const allowlist = getAdminAllowlist();
  const admin = getServiceRoleClient();
  let role: string | null = null;
  let portalStaff = false;
  if (admin && user?.id) {
    const { data } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = (data?.role as string) ?? null;
    if (email) {
      const { data: staff } = await admin
        .from("portal_staff")
        .select("active")
        .ilike("email", email)
        .eq("active", true)
        .maybeSingle();
      portalStaff = Boolean(staff);
    }
  }
  return {
    email,
    allowlistHit: email ? allowlist.includes(email) : false,
    role,
    portalStaff,
    allowed: await canManageAcademy(user),
  };
}
