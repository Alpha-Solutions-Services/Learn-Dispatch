import type { User } from "@supabase/supabase-js";
import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { createClient } from "@/lib/supabase/server";

/** Admin allowlist, instructor, or dispatcher may manage academy enrollments. */
export async function canManageAcademy(user: User | null): Promise<boolean> {
  if (!user?.id) return false;
  if (isAllowedAdminEmail(user.email)) return true;

  const sb = await createClient();
  if (!sb) return false;

  const { data } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "instructor" || data?.role === "dispatcher";
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
