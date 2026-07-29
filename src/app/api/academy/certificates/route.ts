import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { certificateHtml } from "@/lib/academy/certificate";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const issueSchema = z.object({
  studentId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

function certNo() {
  const d = new Date();
  return `AFC-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Misconfigured" }, { status: 500 });

  const staff = await requireAcademyStaff(user);
  const studentId = req.nextUrl.searchParams.get("studentId");
  const download = req.nextUrl.searchParams.get("download") === "1";
  const certId = req.nextUrl.searchParams.get("id");

  if (download && certId) {
    const { data: cert } = await admin
      .from("academy_certificates")
      .select("*")
      .eq("id", certId)
      .maybeSingle();
    if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!staff.ok && cert.student_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const html = certificateHtml(cert as Parameters<typeof certificateHtml>[0]);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${cert.certificate_no}.html"`,
      },
    });
  }

  if (staff.ok) {
    let q = admin
      .from("academy_certificates")
      .select("*")
      .order("issued_at", { ascending: false })
      .limit(100);
    if (studentId) q = q.eq("student_id", studentId);
    const { data } = await q;
    return NextResponse.json({ certificates: data ?? [] });
  }

  const { data } = await admin
    .from("academy_certificates")
    .select("*")
    .eq("student_id", user.id)
    .order("issued_at", { ascending: false });
  return NextResponse.json({ certificates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const admin = getServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Misconfigured" }, { status: 500 });

  try {
    const body = issueSchema.parse(await req.json());
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name,email,batch_code,role")
      .eq("id", body.studentId)
      .maybeSingle();
    if (!profile || profile.role !== "student") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { count } = await admin
      .from("academy_progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", body.studentId)
      .eq("status", "completed");

    const row = {
      certificate_no: certNo(),
      student_id: body.studentId,
      student_name: (profile.full_name as string) || "Student",
      student_email: (profile.email as string) || "",
      batch_code: (profile.batch_code as string) || null,
      issued_by: auth.user.id,
      modules_completed: count ?? 0,
      note: body.note ?? null,
    };

    const { data, error } = await admin
      .from("academy_certificates")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("[certificates]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, certificate: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
