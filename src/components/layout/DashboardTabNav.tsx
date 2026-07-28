"use client";

import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export type DashboardTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/**
 * Aligned tab grid for client + admin dashboards (mobile-first).
 * Uses a consistent 2/3/4 column grid so wraps don't leave ragged rows.
 */
export function DashboardTabNav({
  tabs,
  activeId,
  onChange,
  className,
}: {
  tabs: DashboardTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "mb-8 grid grid-cols-2 gap-2 border-b border-[var(--color-border)] pb-4 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {tabs.map((tab) => {
        const selected = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "inline-flex h-11 w-full items-center justify-start gap-2 rounded-xl px-3 text-left text-sm font-medium transition-colors",
              selected
                ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40"
                : "bg-[var(--color-surface)]/40 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{tab.label}</span>
            {tab.badge && tab.badge > 0 ? (
              <span className="ml-auto shrink-0 rounded-full bg-[var(--color-accent)] px-1.5 text-[10px] font-bold text-[#05080f]">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
