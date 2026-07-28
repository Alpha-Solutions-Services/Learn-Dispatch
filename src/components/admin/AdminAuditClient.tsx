"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";

type AuditRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
};

export function AdminAuditClient() {
  const [events, setEvents] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/audit")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        setEvents(j.events ?? []);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-[var(--color-accent)]" />
        <div>
          <h1
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Audit log
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Last 200 staff / sensitive actions
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="overflow-auto rounded-2xl border border-[var(--color-border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/50">
              <tr>
                <th className="p-3 font-semibold text-[var(--color-muted)]">
                  When
                </th>
                <th className="p-3 font-semibold text-[var(--color-muted)]">
                  Actor
                </th>
                <th className="p-3 font-semibold text-[var(--color-muted)]">
                  Action
                </th>
                <th className="p-3 font-semibold text-[var(--color-muted)]">
                  Target
                </th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-[var(--color-muted)]"
                  >
                    No audit events yet. Run audit-events.sql in Supabase if
                    this stays empty after actions.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--color-border)]/50 align-top"
                  >
                    <td className="whitespace-nowrap p-3 text-[var(--color-muted)]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-[var(--color-text)]">
                      {e.actor_email || "—"}
                    </td>
                    <td className="p-3 font-medium text-[var(--color-accent)]">
                      {e.action}
                    </td>
                    <td className="p-3 text-[var(--color-muted)]">
                      {e.target_type || "—"}
                      {e.target_id ? (
                        <span className="mt-0.5 block truncate text-[11px] opacity-80">
                          {e.target_id}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
