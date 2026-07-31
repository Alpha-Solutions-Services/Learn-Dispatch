import { NextRequest, NextResponse } from "next/server";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import {
  createAiQuizAttempt,
  getLatestSubmittedAttempt,
  getOpenQuizAttempt,
  getPublishedModuleById,
  getQuizAccess,
} from "@/lib/academy/academy-db";
import {
  generateModuleQuizQuestions,
  stripCorrectIndex,
} from "@/lib/academy/quiz-ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ moduleId: string }> | { moduleId: string } };

async function resolveParams(params: Ctx["params"]) {
  return typeof (params as Promise<{ moduleId: string }>).then === "function"
    ? await (params as Promise<{ moduleId: string }>)
    : (params as { moduleId: string });
}

/** Start or resume an AI-generated 5-question module quiz (no correct_index). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { moduleId } = await resolveParams(ctx.params);

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) {
    return NextResponse.json({ error: "Active paid enrollment required" }, { status: 403 });
  }

  const mod = await getPublishedModuleById(moduleId);
  if (!mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const quizAccess = await getQuizAccess(user.id, moduleId);
  if (!quizAccess.ok) {
    const last = await getLatestSubmittedAttempt(user.id, moduleId);
    return NextResponse.json({
      locked: true,
      reason: quizAccess.reason,
      message: quizAccess.message,
      lastScore: quizAccess.lastScore,
      lastPassed: quizAccess.lastPassed,
      review: last?.review ?? null,
      passMark: 70,
    });
  }

  const open = await getOpenQuizAttempt(user.id, moduleId);
  if (open) {
    return NextResponse.json({
      locked: false,
      attemptId: open.id,
      questions: stripCorrectIndex(open.questions),
      generating: false,
    });
  }

  try {
    const generated = await generateModuleQuizQuestions({
      title: mod.title,
      summary: mod.summary,
      contentMd: mod.content_md,
    });
    const created = await createAiQuizAttempt({
      studentId: user.id,
      moduleId,
      assignmentId: quizAccess.assignmentId,
      questions: generated,
    });
    if (!created) {
      return NextResponse.json({ error: "Could not save quiz attempt" }, { status: 500 });
    }
    return NextResponse.json({
      locked: false,
      attemptId: created.id,
      questions: stripCorrectIndex(created.questions),
      generating: false,
    });
  } catch (e) {
    console.error("[quizzes/module] AI generate", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not generate quiz. Check AI configuration and try again.",
      },
      { status: 503 },
    );
  }
}
