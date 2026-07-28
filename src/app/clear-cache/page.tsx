"use client";

import { useEffect, useState } from "react";

/**
 * One-tap page to clear Portal/Learn Dispatch service workers and open instructor login.
 * Open: https://learndispatch.alphasolutions.software/clear-cache
 */
export default function ClearCachePage() {
  const [status, setStatus] = useState("Clearing cache…");

  useEffect(() => {
    void (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        setStatus("Cache cleared. Opening instructor login…");
        window.setTimeout(() => {
          window.location.replace("/login?role=instructor");
        }, 600);
      } catch {
        setStatus("Could not clear fully. Opening login anyway…");
        window.setTimeout(() => {
          window.location.replace("/login?role=instructor");
        }, 800);
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Learn Dispatch</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">{status}</p>
        <p className="mt-6 text-xs text-[var(--color-muted)]">
          After this, the address bar must say{" "}
          <strong className="text-[var(--color-accent)]">learndispatch.alphasolutions.software</strong>
          — not portal.
        </p>
      </div>
    </main>
  );
}
