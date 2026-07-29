import { NextRequest, NextResponse } from "next/server";
import { challanHtml, getLatestChallanForStudent } from "@/lib/academy/challan";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download fee challan HTML (student own, or staff any). ?studentId= for staff */
export async function GET(req: NextRequest) {
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

  const staff = await requireAcademyStaff(user);
  const studentIdParam = req.nextUrl.searchParams.get("studentId");
  const studentId =
    staff.ok && studentIdParam ? studentIdParam : user.id;

  if (!staff.ok && studentIdParam && studentIdParam !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const challan = await getLatestChallanForStudent(studentId);
  if (!challan) {
    return NextResponse.json({ error: "No challan found" }, { status: 404 });
  }

  const html = challanHtml(challan as Parameters<typeof challanHtml>[0]);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${challan.challan_no}.html"`,
    },
  });
}
