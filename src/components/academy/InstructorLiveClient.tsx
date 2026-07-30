"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio, Trash2, Video } from "lucide-react";

type Session = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  join_url: string;
  provider: string;
};

export default function InstructorLiveClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [title, setTitle] = useState("Live dispatcher Q&A");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/academy/live-sessions");
    const body = (await res.json()) as { sessions?: Session[]; error?: string };
    if (!res.ok) throw new Error(body.error ?? "Load failed");
    setSessions(body.sessions ?? []);
  }, []);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const when = startsAt ? new Date(startsAt) : new Date(Date.now() + 30 * 60_000);
      const res = await fetch("/api/academy/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          startsAt: when.toISOString(),
          durationMinutes: duration,
          provider: "jitsi",
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Create failed");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/academy/live-sessions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-display)" }}>
        Live sessions
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Free Jitsi rooms — no Zoom license needed. Students join from Live in the studio.
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <label className="block text-xs text-[var(--color-muted)]">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <label className="block text-xs text-[var(--color-muted)]">Notes (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--color-muted)]">Starts</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-muted)]">Minutes</label>
            <input
              type="number"
              min={15}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 60)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void create()}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[#05080f] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          Create free Jitsi session
        </button>
      </div>

      <ul className="mt-8 space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/30 px-4 py-4"
          >
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Radio className="h-4 w-4 text-[var(--color-accent)]" />
                {s.title}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {new Date(s.starts_at).toLocaleString()} · {s.duration_minutes} min · {s.provider}
              </p>
              <a
                href={s.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-[var(--color-accent)] underline"
              >
                Open room
              </a>
            </div>
            <button
              type="button"
              onClick={() => void remove(s.id)}
              className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-muted)] hover:text-red-300"
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No upcoming live sessions yet.</p>
        ) : null}
      </ul>
    </main>
  );
}
