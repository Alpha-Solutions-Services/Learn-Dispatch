import { NextResponse } from "next/server";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { listPublishedModules } from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  const auth = await requireAcademyStaff(user);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const modules = await listPublishedModules();
  return NextResponse.json({
    modules: modules.map((m) => ({
      id: m.id as string,
      title: m.title as string,
      sort_order: (m.sort_order as number) ?? 0,
    })),
  });
}
