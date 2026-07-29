"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageCircle } from "lucide-react";
import { WhatsAppChat } from "@/components/chat/WhatsAppChat";

type Thread = {
  id: string;
  client_email: string | null;
  studentName?: string | null;
  batchCode?: string | null;
  whatsapp?: string | null;
  unread?: number;
  lastMessage?: { body: string; created_at: string } | null;
};

export default function InstructorInboxClient() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/academy/threads");
      const body = (await res.json()) as { error?: string; threads?: Thread[] };
      if (!res.ok) throw new Error(body.error ?? "Could not load inbox");
      setThreads(body.threads ?? []);
      if (!active && body.threads?.[0]?.id) setActive(body.threads[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <MessageCircle className="h-4 w-4 text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold text-[var(--color-text)]">Student inbox</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-red-300">{error}</p>
        ) : threads.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-muted)]">No student messages yet.</p>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={clsx(
                    "w-full border-b border-[var(--color-border)]/60 px-4 py-3 text-left transition hover:bg-white/5",
                    active === t.id && "bg-[var(--color-accent)]/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">
                      {t.studentName || t.client_email || "Student"}
                    </p>
                    {(t.unread ?? 0) > 0 ? (
                      <span className="rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-[#05080f]">
                        {t.unread}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] text-[var(--color-muted)]">
                    {t.lastMessage?.body || "No messages"}
                  </p>
                  {t.batchCode ? (
                    <p className="mt-1 text-[10px] text-[var(--color-chrome)]">Batch {t.batchCode}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="h-[min(75vh,720px)] overflow-hidden rounded-2xl border border-[var(--color-border)]">
        {active ? (
          <WhatsAppChat mode="admin" threadId={active} className="h-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            Select a student conversation
          </div>
        )}
      </section>
    </div>
  );
}
