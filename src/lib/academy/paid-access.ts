export type PaidAccessProfile = {
  role: string | null;
  enrollment_status: string | null;
  paid_until: string | null;
};

/** Active academy access: paid + not past paid_until. Safe for client + server. */
export function isPaidAccessActive(profile: PaidAccessProfile | null | undefined): boolean {
  if (!profile || profile.role !== "student") return false;
  if (profile.enrollment_status !== "paid") return false;
  if (!profile.paid_until) return true; // legacy rows without expiry still allowed until backfilled
  return new Date(profile.paid_until).getTime() >= Date.now();
}
