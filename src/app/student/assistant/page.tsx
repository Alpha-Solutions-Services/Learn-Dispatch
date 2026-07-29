import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AiChatPanel } from "@/components/ai/AiChatPanel";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI assistant — Learn Dispatch",
};

export default async function StudentAssistantPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) redirect("/enroll?reason=payment");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1
        className="text-2xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Study assistant
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Ask about dispatch concepts, paperwork, or how to use a module. Powered by Groq — not a
        substitute for your instructor.
      </p>
      <div className="mt-6 min-h-[520px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <AiChatPanel />
      </div>
    </main>
  );
}
