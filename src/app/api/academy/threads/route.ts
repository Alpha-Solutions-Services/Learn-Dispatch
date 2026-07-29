import { NextResponse } from "next/server";
import { requireAcademyStaff } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Instructor inbox: Learn Dispatch students only (never portal client threads). */
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

  const { data: students, error: studentErr } = await db
    .from("profiles")
    .select("id, full_name, batch_code, whatsapp_phone, email")
    .eq("role", "student");

  if (studentErr) {
    console.error("[academy/threads students]", studentErr);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const studentIds = (students ?? []).map((s) => s.id as string);
  if (studentIds.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  const byId = new Map(
    (students ?? []).map((s) => [
      s.id as string,
      {
        studentName: (s.full_name as string) || null,
        batchCode: (s.batch_code as string) || null,
        whatsapp: (s.whatsapp_phone as string) || null,
        email: (s.email as string) || null,
      },
    ]),
  );

  const { data: threads, error } = await db
    .from("dm_threads")
    .select("id, client_user_id, client_email, created_at, updated_at, admin_last_read_at")
    .in("client_user_id", studentIds)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[academy/threads]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const enriched = await Promise.all(
    (threads ?? []).map(async (t) => {
      const meta = byId.get(t.client_user_id as string);
      const { data: last } = await db
        .from("dm_messages")
        .select("body, created_at, is_admin, attachment_name")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1)
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
        client_email: t.client_email || meta?.email || null,
        unread,
        studentName: meta?.studentName ?? null,
        batchCode: meta?.batchCode ?? null,
        whatsapp: meta?.whatsapp ?? null,
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

  return NextResponse.json({ threads: enriched });
}
