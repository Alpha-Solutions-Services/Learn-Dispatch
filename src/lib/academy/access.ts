import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type PaidAccessProfile = {
  role: string | null;
  enrollment_status: string | null;
  paid_until: string | null;
};

/** Active academy access: paid + not past paid_until. */
export function isPaidAccessActive(profile: PaidAccessProfile | null | undefined): boolean {
  if (!profile || profile.role !== "student") return false;
  if (profile.enrollment_status !== "paid") return false;
  if (!profile.paid_until) return true; // legacy rows without expiry still allowed until backfilled
  return new Date(profile.paid_until).getTime() >= Date.now();
}

export async function getStudentPaidAccess(userId: string): Promise<PaidAccessProfile | null> {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("role, enrollment_status, paid_until")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PaidAccessProfile;
}
