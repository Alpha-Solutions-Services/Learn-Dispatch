"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

const ICONS: Record<string, LucideIcon> = {
  learn: LayoutDashboard,
  live: Video,
  chat: MessageCircle,
  assist: Sparkles,
  certs: Award,
  pay: GraduationCap,
  quiz: ClipboardList,
  progress: BarChart3,
};

export type StudentDockItem = {
  href: string;
  label: string;
  /** Serializable icon key — do not pass React components from Server Components */
  icon: keyof typeof ICONS | string;
  match?: string[];
};

function isActive(pathname: string, item: StudentDockItem) {
  const prefixes = item.match ?? [item.href];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Mobile-only bottom tab bar — pinned flush to the screen bottom (safe-area aware).
 */
export function StudentMobileBottomNav({
  items,
}: {
  items: StudentDockItem[];
}) {
  const pathname = usePathname() || "/student/dashboard";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[#0a101c]/98 backdrop-blur-xl md:hidden"
      aria-label="Primary navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul
        className="mx-auto flex w-full max-w-lg flex-nowrap items-stretch gap-0 px-0.5 pt-1 pb-1"
        style={{ minHeight: "3.5rem" }}
      >
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-lg px-0 py-2 transition",
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] active:bg-white/5",
                )}
              >
                <Icon
                  className={clsx(
                    "shrink-0",
                    items.length >= 7 ? "h-4 w-4" : "h-5 w-5",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span
                  className={clsx(
                    "max-w-full truncate text-center font-medium tracking-wide",
                    items.length >= 7 ? "text-[8px]" : "text-[9px] sm:text-[10px]",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
