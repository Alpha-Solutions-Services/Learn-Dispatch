import { NextRequest, NextResponse } from "next/server";
import { markChallanPending } from "@/lib/academy/challan";
import { logPaymentAudit } from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/** Student marks that they sent NayaPay payment — team verifies before granting access. */
export async function POST(_req: NextRequest) {
  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, enrollment_status, payment_notes")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "student") {
    return NextResponse.json({ error: "Student account required" }, { status: 403 });
  }
  if (profile.enrollment_status === "paid") {
    return NextResponse.json({ success: true, alreadyPaid: true });
  }

  const stamp = new Date().toISOString();
  const note = `Student claimed NayaPay payment on ${stamp}. Awaiting team verification.`;

  const { error } = await admin
    .from("profiles")
    .update({
      enrollment_status: "pending",
      payment_notes: note,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[claim-payment]", error);
    return NextResponse.json({ error: "Could not record payment claim" }, { status: 500 });
  }

  await logPaymentAudit({
    studentId: user.id,
    action: "claimed_paid",
    actorId: user.id,
    note,
  });

  await markChallanPending(user.id);

  return NextResponse.json({ success: true, claimedAt: stamp });
}
