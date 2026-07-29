import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GatedVideoPlayer } from "@/components/academy/GatedVideoPlayer";
import { ModuleQuiz } from "@/components/academy/ModuleQuiz";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import {
  getPublishedModuleById,
  listStudentProgress,
} from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } =
    typeof (params as Promise<{ id: string }>).then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });
  const mod = await getPublishedModuleById(id);
  return {
    title: mod ? `${mod.title} — Learn Dispatch` : "Module — Learn Dispatch",
  };
}

export default async function StudentModulePage({ params }: PageProps) {
  const { id } =
    typeof (params as Promise<{ id: string }>).then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });

  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (!user?.id) redirect("/login");

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) {
    redirect(
      access?.enrollment_status === "expired"
        ? "/enroll?reason=expired"
        : "/enroll?reason=payment",
    );
  }

  // Metadata only — video_url never sent to the browser from this RSC
  const mod = await getPublishedModuleById(id, { includeVideo: false });
  if (!mod) notFound();

  const progressRows = await listStudentProgress(user.id);
  const progress = progressRows.find((p) => p.module_id === id);
  const status = (progress?.status as string) ?? "not_started";
  const quizScore = progress?.quiz_score as number | null | undefined;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link
            href="/student/dashboard"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]"
          >
            ← All modules
          </Link>
          <h1
            className="mt-4 text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mod.sort_order}. {mod.title}
          </h1>
          {mod.summary ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{mod.summary}</p>
          ) : null}
          <p className="mt-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            Status: {status.replace("_", " ")}
            {typeof quizScore === "number" ? ` · Quiz ${quizScore}%` : ""}
            {mod.duration_minutes ? ` · ~${mod.duration_minutes} min` : ""}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-chrome)]">
            Lesson video
          </h2>
          <GatedVideoPlayer moduleId={mod.id} watermark={user.email} />
        </section>

        {mod.content_md ? (
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-chrome)]">
              Notes
            </h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-muted)]">
              {mod.content_md}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-chrome)]">
            Module quiz
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Score at least 70% to mark this module complete.
          </p>
          <div className="mt-5">
            <ModuleQuiz moduleId={mod.id} />
          </div>
        </section>
      </div>
    </main>
  );
}
