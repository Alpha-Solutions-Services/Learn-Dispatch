import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WhatsAppChat } from "@/components/chat/WhatsAppChat";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Instructor chat — Learn Dispatch",
};

export default async function StudentMessagesPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) redirect("/enroll?reason=payment");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1
        className="text-2xl font-bold text-[var(--color-text)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Chat with your instructor
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Same secure messaging style as the Alpha client portal. Ask about modules, payments, or
        assignments.
      </p>
      <div className="mt-6 h-[min(70vh,640px)] overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <WhatsAppChat mode="client" currentUserId={user.id} className="h-full" />
      </div>
    </main>
  );
}
