import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
    .select("id,student_id,module_id,note,due_at,created_at")
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
    const { data, error } = await admin
      .from("quiz_assignments")
      .upsert(
        {
          student_id: body.studentId,
          module_id: body.moduleId,
          assigned_by: auth.user.id,
          note: body.note ?? null,
          due_at: body.dueAt ?? null,
        },
        { onConflict: "student_id,module_id" },
      )
      .select("id,student_id,module_id,note,due_at,created_at")
      .single();

    if (error) {
      console.error("[quiz-assign]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, assignment: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
