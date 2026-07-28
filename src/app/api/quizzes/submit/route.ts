import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { gradeQuizSubmission } from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  moduleId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(0).max(20)),
});

/** Grade quiz server-side; never trust client-reported score. */
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
    const result = await gradeQuizSubmission({
      studentId: user.id,
      moduleId: body.moduleId,
      answers: body.answers,
    });

    if (!result) {
      return NextResponse.json(
        { error: "No quiz questions found for this module" },
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
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[quizzes/submit]", e);
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
