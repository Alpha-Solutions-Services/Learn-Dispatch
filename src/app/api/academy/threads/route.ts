import { NextResponse } from "next/server";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Instructor inbox thread list (Learn Dispatch — not Portal staff gate). */
export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  const auth = await requireAcademyStaff(user);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const db = getServiceRoleClient();
  if (!db) return NextResponse.json({ threads: [] });

  const { data: threads, error } = await db
    .from("dm_threads")
    .select("id, client_user_id, client_email, created_at, updated_at, admin_last_read_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[academy/threads]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const enriched = await Promise.all(
    (threads ?? []).map(async (t) => {
      const { data: last } = await db
        .from("dm_messages")
        .select("body, created_at, is_admin, attachment_name")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: profile } = await db
        .from("profiles")
        .select("full_name, role, batch_code, whatsapp_phone")
        .eq("id", t.client_user_id)
        .maybeSingle();

      let unread = 0;
      let q = db
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", t.id)
        .eq("is_admin", false);
      if (t.admin_last_read_at) q = q.gt("created_at", t.admin_last_read_at);
      const { count: uc } = await q;
      unread = uc ?? 0;

      return {
        ...t,
        unread,
        studentName: (profile?.full_name as string) || null,
        studentRole: profile?.role ?? null,
        batchCode: profile?.batch_code ?? null,
        whatsapp: profile?.whatsapp_phone ?? null,
        lastMessage: last
          ? {
              body: last.body || last.attachment_name || "[attachment]",
              created_at: last.created_at,
              is_admin: last.is_admin,
            }
          : null,
      };
    }),
  );

  // Prefer student threads for instructor desk
  const studentsFirst = enriched.sort((a, b) => {
    const aS = a.studentRole === "student" ? 0 : 1;
    const bS = b.studentRole === "student" ? 0 : 1;
    return aS - bS;
  });

  return NextResponse.json({ threads: studentsFirst });
}
