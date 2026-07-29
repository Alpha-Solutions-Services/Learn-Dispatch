"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PlayCircle, RefreshCw } from "lucide-react";

type VideoPayload =
  | { provider: "r2"; signedUrl: string; expiresIn: number }
  | { provider: "youtube"; videoId: string; expiresIn: null }
  | { provider: "none"; message: string };

export function GatedVideoPlayer({ moduleId }: { moduleId: string }) {
  const [payload, setPayload] = useState<VideoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setPlayError(null);
      try {
        const res = await fetch(`/api/modules/${moduleId}/video`);
        const body = (await res.json()) as VideoPayload & { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not load video");
        if (!cancelled) setPayload(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Video unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [moduleId, reloadKey]);

  if (loading) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/60">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-sm text-red-200">
        {error}
        <button
          type="button"
          className="mt-3 flex items-center gap-2 text-xs text-[var(--color-accent)]"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!payload || payload.provider === "none") {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/60 px-6 text-center">
        <PlayCircle className="h-8 w-8 text-[var(--color-muted)]" />
        <p className="text-sm text-[var(--color-muted)]">
          {payload && "message" in payload
            ? payload.message
            : "Video is not available for this module yet."}
        </p>
      </div>
    );
  }

  if (payload.provider === "youtube") {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube-nocookie.com/embed/${payload.videoId}?rel=0`}
          title="Module video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
      <video
        key={payload.signedUrl}
        ref={videoRef}
        className="aspect-video w-full"
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        src={payload.signedUrl}
        onError={() =>
          setPlayError(
            "Playback failed. Usually R2 CORS is missing — in Cloudflare R2 → learndispatch → Settings → CORS, allow https://learndispatch.alphasolutions.software for GET/HEAD. Then refresh.",
          )
        }
      >
        Your browser does not support video playback.
      </video>
      {playError ? (
        <p className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {playError}
        </p>
      ) : (
        <p className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
          Secure link expires in ~{Math.round(payload.expiresIn / 60)} minutes — refresh the page to
          renew.
        </p>
      )}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 border-t border-[var(--color-border)] py-2 text-xs text-[var(--color-accent)]"
        onClick={() => setReloadKey((k) => k + 1)}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Renew secure link
      </button>
    </div>
  );
}
