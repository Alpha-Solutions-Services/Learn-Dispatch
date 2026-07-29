"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  Loader2,
  Maximize,
  Pause,
  Play,
  PlayCircle,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";

type VideoPayload =
  | {
      provider: "r2";
      streamUrl?: string;
      expiresIn: number;
    }
  | { provider: "youtube"; videoId: string; expiresIn: null }
  | { provider: "none"; message: string };

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Paid lesson player — blocks casual save / open / copy from the browser menu. */
export function GatedVideoPlayer({
  moduleId,
  watermark,
}: {
  moduleId: string;
  watermark?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [payload, setPayload] = useState<VideoPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const blockMenu = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      <div
        className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black"
        onContextMenu={blockMenu}
      >
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube-nocookie.com/embed/${payload.videoId}?rel=0&modestbranding=1&controls=1`}
          title="Module video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  const src = payload.streamUrl || "";

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }

  function seek(pct: number) {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (pct / 100) * duration;
  }

  async function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen().catch(() => {});
  }

  return (
    <div
      ref={shellRef}
      className="select-none overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black"
      onContextMenu={blockMenu}
      onDragStart={blockMenu}
    >
      <div className="relative aspect-video w-full bg-black">
        <video
          key={`${src}-${reloadKey}`}
          ref={videoRef}
          className="h-full w-full object-contain"
          playsInline
          preload="metadata"
          src={src}
          controls={false}
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          draggable={false}
          onContextMenu={blockMenu}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v) return;
            setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
          }}
          onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration || 0);
          }}
          onError={() => {
            setPlayError("Playback failed. Tap Renew stream, or contact your instructor.");
          }}
        />

        {/* Catch right-clicks / long-press above the frame without blocking custom controls */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          onContextMenu={blockMenu}
          onDoubleClick={togglePlay}
          onClick={togglePlay}
          style={{ bottom: 52 }}
        />

        {watermark ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[2] flex items-end justify-end p-3"
          >
            <span className="rounded bg-black/35 px-2 py-1 text-[10px] text-white/55">
              {watermark}
            </span>
          </div>
        ) : null}

        <div
          className="absolute inset-x-0 bottom-0 z-[3] bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2.5 pt-8"
          onContextMenu={blockMenu}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="mb-2 h-1 w-full cursor-pointer accent-[var(--color-accent)]"
            aria-label="Seek"
          />
          <div className="flex items-center gap-2 text-white">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
              }}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-[11px] tabular-nums text-white/80">
              {formatTime(((progress / 100) * duration) || 0)} / {formatTime(duration)}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {playError ? (
        <p className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {playError}
        </p>
      ) : null}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 border-t border-[var(--color-border)] py-2 text-xs text-[var(--color-accent)]"
        onClick={() => setReloadKey((k) => k + 1)}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Renew stream
      </button>
    </div>
  );
}
