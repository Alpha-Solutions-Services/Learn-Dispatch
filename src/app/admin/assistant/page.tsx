import type { Metadata } from "next";
import { AiChatPanel } from "@/components/ai/AiChatPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI assistant — Learn Dispatch Instructor",
};

export default function AdminAssistantPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1
        className="text-2xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Instructor AI assist
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Draft student replies, explain modules, or plan quizzes. Separate from Client Portal chat.
      </p>
      <div className="mt-6 min-h-[520px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <AiChatPanel variant="instructor" />
      </div>
    </main>
  );
}
