import { NextRequest, NextResponse } from "next/server";
import { logPaymentAudit } from "@/lib/academy/academy-db";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron: expire paid enrollments past paid_until. */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, email, enrollment_plan, paid_until")
    .eq("role", "student")
    .eq("enrollment_status", "paid")
    .lt("paid_until", nowIso);

  if (error) {
    console.error("[cron/expire-enrollments] list", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const expired: string[] = [];
  for (const row of rows ?? []) {
    const id = row.id as string;
    const { error: upErr } = await admin
      .from("profiles")
      .update({ enrollment_status: "expired" })
      .eq("id", id)
      .eq("role", "student")
      .eq("enrollment_status", "paid");

    if (upErr) {
      console.error("[cron/expire-enrollments] update", id, upErr);
      continue;
    }

    await logPaymentAudit({
      studentId: id,
      action: "expired",
      actorId: null,
      note: `Auto-expired by cron; paid_until was ${row.paid_until as string}`,
    });
    expired.push(id);
  }

  return NextResponse.json({
    ok: true,
    checkedAt: nowIso,
    expiredCount: expired.length,
    expiredIds: expired,
  });
}
