import { getServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isPaidAccessActive,
  type PaidAccessProfile,
} from "@/lib/academy/paid-access";

export type { PaidAccessProfile };
export { isPaidAccessActive };

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
