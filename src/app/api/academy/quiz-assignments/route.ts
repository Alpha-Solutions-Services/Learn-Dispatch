import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendQuizAssignedEmail } from "@/lib/academy/emails";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  studentId: z.string().uuid(),
  moduleId: z.string().uuid(),
  note: z.string().max(500).optional(),
  dueAt: z.string().datetime().optional(),
});

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ assignments: [] });

  const { data } = await admin
    .from("quiz_assignments")
    .select("id,student_id,module_id,note,due_at,created_at,consumed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

  try {
    const body = schema.parse(await req.json());

    // Abandon any stale in-progress attempt so retake generates a fresh AI set.
    await admin
      .from("quiz_attempts")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score: null,
        passed: false,
      })
      .eq("student_id", body.studentId)
      .eq("module_id", body.moduleId)
      .eq("status", "in_progress");

    const { data, error } = await admin
      .from("quiz_assignments")
      .upsert(
        {
          student_id: body.studentId,
          module_id: body.moduleId,
          assigned_by: auth.user.id,
          note: body.note ?? null,
          due_at: body.dueAt ?? null,
          consumed_at: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "student_id,module_id" },
      )
      .select("id,student_id,module_id,note,due_at,created_at,consumed_at")
      .single();

    if (error) {
      console.error("[quiz-assign]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [{ data: student }, { data: mod }] = await Promise.all([
      admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", body.studentId)
        .maybeSingle(),
      admin
        .from("academy_modules")
        .select("title")
        .eq("id", body.moduleId)
        .maybeSingle(),
    ]);
    if (student?.email) {
      void sendQuizAssignedEmail({
        studentEmail: student.email as string,
        studentName: (student.full_name as string) || "Student",
        moduleTitle: (mod?.title as string) || "Module quiz",
        note: body.note,
        dueAt: body.dueAt,
      });
    }

    return NextResponse.json({ ok: true, assignment: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
