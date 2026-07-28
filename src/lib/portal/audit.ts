import type { User } from "@supabase/supabase-js";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export type AuditEventInput = {
  actor?: User | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Fire-and-forget audit write — never throws to callers. */
export function logAuditEvent(input: AuditEventInput): void {
  void (async () => {
    try {
      const db = getServiceRoleClient();
      if (!db) return;
      await db.from("audit_events").insert({
        actor_user_id: input.actor?.id ?? input.actorUserId ?? null,
        actor_email:
          input.actor?.email ?? input.actorEmail ?? null,
        action: input.action,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        metadata: input.metadata ?? null,
      });
    } catch (e) {
      console.error("[audit] write failed", e);
    }
  })();
}
