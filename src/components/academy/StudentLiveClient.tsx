"use client";

import { useEffect, useState } from "react";
import { Loader2, Radio, Video } from "lucide-react";

type Session = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  join_url: string;
};

export default function StudentLiveClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/academy/live-sessions");
        const body = (await res.json()) as { sessions?: Session[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not load sessions");
        setSessions(body.sessions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
        Live sessions
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Join instructor-led classes in your browser — no paid Zoom account required.
      </p>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      <ul className="mt-8 space-y-3">
        {sessions.map((s) => {
          const start = new Date(s.starts_at);
          const soon = start.getTime() - Date.now() < 2 * 60 * 60 * 1000 && start.getTime() > Date.now() - 30 * 60_000;
          return (
            <li
              key={s.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 px-5 py-4"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Radio className="h-4 w-4 text-[var(--color-accent)]" />
                {s.title}
                {soon ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                    Live soon
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {start.toLocaleString()} · {s.duration_minutes} minutes
              </p>
              {s.description ? (
                <p className="mt-2 text-sm text-[var(--color-muted)]">{s.description}</p>
              ) : null}
              <a
                href={s.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[#05080f]"
              >
                <Video className="h-4 w-4" /> Join session
              </a>
            </li>
          );
        })}
      </ul>
      {sessions.length === 0 && !error ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">
          No live sessions scheduled. Check back when your instructor posts one.
        </p>
      ) : null}
    </main>
  );
}
