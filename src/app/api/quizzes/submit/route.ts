import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { submitQuizAttempt } from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  attemptId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(0).max(20)),
});

/** Grade AI quiz attempt server-side; return per-question review. */
export async function POST(req: NextRequest) {
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

  try {
    const body = schema.parse(await req.json());
    const result = await submitQuizAttempt({
      studentId: user.id,
      attemptId: body.attemptId,
      answers: body.answers,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Quiz attempt not found or already submitted" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      score: result.score,
      passed: result.passed,
      total: result.total,
      correct: result.correct,
      passMark: 70,
      review: result.review,
      locked: !result.passed,
      message: result.passed
        ? "Module marked complete."
        : "Ask your instructor to assign a retake for a new AI quiz.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[quizzes/submit]", e);
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
