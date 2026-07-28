import type { User } from "@supabase/supabase-js";
import {
  getAdminAllowlist,
  isAllowedAdminEmail,
  isSuperAdminEmail,
} from "@/lib/admin-allowlist";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type StaffRole = "owner" | "staff" | null;

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function getOwnerAllowlist(): string[] {
  const envRaw = process.env.OWNER_EMAILS?.trim();
  if (envRaw) {
    return envRaw
      .split(",")
      .map((s) => normalize(s))
      .filter(Boolean);
  }
  // Default: super admins are owners
  return getAdminAllowlist().slice(0, 2);
}

/** Any admin (owner or staff) via env allowlist or DB portal_staff */
/** Sync env allowlist only. Prefer `isPortalStaff` for API / layout gates. */
export function isAdminUser(user: User | null): boolean {
  return isAllowedAdminEmail(user?.email);
}

export function isOwnerUser(user: User | null): boolean {
  if (!user?.email) return false;
  if (isSuperAdminEmail(user.email)) return true;
  return new Set(getOwnerAllowlist()).has(normalize(user.email));
}

/** Owner via env allowlist OR active portal_staff.role = owner */
export async function isOwnerUserAsync(user: User | null): Promise<boolean> {
  if (!user?.email) return false;
  if (isOwnerUser(user)) return true;
  const db = getServiceRoleClient();
  if (!db) return false;
  const { data } = await db
    .from("portal_staff")
    .select("role, active")
    .ilike("email", user.email)
    .eq("active", true)
    .eq("role", "owner")
    .maybeSingle();
  return Boolean(data);
}

export async function resolveStaffRole(
  user: User | null
): Promise<StaffRole> {
  if (!user?.email) return null;
  if (await isOwnerUserAsync(user)) return "owner";
  if (!isAllowedAdminEmail(user.email)) {
    const db = getServiceRoleClient();
    if (!db) return null;
    const { data } = await db
      .from("portal_staff")
      .select("role, active")
      .ilike("email", user.email)
      .eq("active", true)
      .maybeSingle();
    if (!data) return null;
    return data.role === "owner" ? "owner" : "staff";
  }
  return "staff";
}

/** True if env admin OR active portal_staff row */
export async function isPortalStaff(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isAllowedAdminEmail(user.email)) return true;
  const role = await resolveStaffRole(user);
  return role === "owner" || role === "staff";
}

export function requireOwner(user: User | null): boolean {
  return isOwnerUser(user);
}
