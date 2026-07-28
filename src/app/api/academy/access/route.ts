import { NextResponse } from "next/server";
import { academyAccessDebug, canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Used by login form to decide post-login destination (not Portal /api/staff). */
export async function GET() {
  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canManageAcademy(user);
  const debug = await academyAccessDebug(user);

  return NextResponse.json({
    ok: true,
    allowed,
    email: user.email,
    debug,
  });
}
