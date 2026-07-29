import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

export function certificateHtml(row: {
  certificate_no: string;
  student_name: string;
  student_email: string;
  batch_code: string | null;
  modules_completed: number;
  issued_at: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Certificate ${row.certificate_no}</title>
<style>
body{font-family:Georgia,serif;background:#0b1220;color:#edf2f8;padding:40px}
.card{max-width:800px;margin:0 auto;border:2px solid #38a3ff;padding:48px;background:linear-gradient(180deg,#0f1829,#05080f);text-align:center}
h1{font-size:28px;letter-spacing:.08em;margin:0}
.sub{color:#6a8caf;margin-top:8px}
.name{font-size:34px;margin:28px 0 8px;color:#5bc8ff}
.meta{font-size:14px;color:#8fb4d4;line-height:1.6}
@media print{body{background:#fff;color:#111}.card{border-color:#222;background:#fff}.name{color:#0b4a7a}}
</style></head>
<body>
<div class="card">
  <p class="sub">ALPHA FREIGHT NETWORK · LEARN DISPATCH</p>
  <h1>CERTIFICATE OF COMPLETION</h1>
  <p class="sub">Professional Truck Dispatcher Training</p>
  <p class="name">${row.student_name}</p>
  <p class="meta">
    Email: ${row.student_email}<br/>
    Batch: ${row.batch_code || "—"} · Modules completed: ${row.modules_completed}<br/>
    Certificate No. <strong>${row.certificate_no}</strong><br/>
    Issued ${new Date(row.issued_at).toLocaleDateString()}
  </p>
  <p class="sub" style="margin-top:32px">Muhammad Mikran Sandhu · Course Author</p>
</div>
</body></html>`;
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
