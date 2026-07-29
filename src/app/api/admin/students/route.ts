import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listAcademyStudents,
  setStudentEnrollmentStatus,
} from "@/lib/academy/academy-db";
import { sendPaymentClearedEmail } from "@/lib/academy/emails";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  const auth = await requireAcademyStaff(user);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const students = await listAcademyStudents(status ? { status } : undefined);
  return NextResponse.json({ students });
}

const patchSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["pending", "paid", "unpaid", "refunded"]),
  notes: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  const auth = await requireAcademyStaff(user);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = patchSchema.parse(await req.json());
    const updated = await setStudentEnrollmentStatus({
      studentId: body.studentId,
      status: body.status,
      confirmedBy: auth.user.id,
      notes: body.notes,
    });
    if (!updated) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (body.status === "paid" && updated.email) {
      void sendPaymentClearedEmail({
        studentEmail: updated.email,
        studentName: updated.fullName,
        planSummary: updated.enrollmentPlan || undefined,
      });
    }
    return NextResponse.json({ ok: true, student: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[admin/students PATCH]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
