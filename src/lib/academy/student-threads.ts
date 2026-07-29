import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensure a DM thread belongs to a Learn Dispatch student (not a portal client). */
export async function getStudentDmThread(
  db: SupabaseClient,
  threadId: string,
): Promise<{
  thread: { id: string; client_user_id: string; client_email: string | null };
  profile: {
    id: string;
    full_name: string | null;
    batch_code: string | null;
    whatsapp_phone: string | null;
  };
} | null> {
  const { data: thread } = await db
    .from("dm_threads")
    .select("id, client_user_id, client_email")
    .eq("id", threadId)
    .maybeSingle();

  if (!thread?.client_user_id) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("id, role, full_name, batch_code, whatsapp_phone")
    .eq("id", thread.client_user_id)
    .maybeSingle();

  if (!profile || profile.role !== "student") return null;

  return {
    thread: {
      id: thread.id as string,
      client_user_id: thread.client_user_id as string,
      client_email: (thread.client_email as string | null) ?? null,
    },
    profile: {
      id: profile.id as string,
      full_name: (profile.full_name as string | null) ?? null,
      batch_code: (profile.batch_code as string | null) ?? null,
      whatsapp_phone: (profile.whatsapp_phone as string | null) ?? null,
    },
  };
}
