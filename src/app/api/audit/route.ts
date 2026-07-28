import { NextResponse } from "next/server";
import { isPortalStaff } from "@/lib/admin-auth";
import { getSessionUser } from "@/lib/portal/require-session";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const session = await getSessionUser();
  if ("error" in session) return session.error;
  if (!(await isPortalStaff(session.user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ events: [] });

  const { data, error } = await db
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[audit GET]", error);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
