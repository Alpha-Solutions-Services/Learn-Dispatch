"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
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
        className={clsx(
          "mx-auto grid max-w-lg gap-0 px-1 pt-1 pb-1",
          items.length <= 4 && "grid-cols-4",
          items.length === 5 && "grid-cols-5",
          items.length >= 6 && "grid-cols-6",
        )}
      >
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-xl px-0.5 py-2.5 transition",
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] active:bg-white/5",
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span className="text-[9px] font-medium tracking-wide sm:text-[10px]">
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
