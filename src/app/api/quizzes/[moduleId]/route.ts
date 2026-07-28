import { NextRequest, NextResponse } from "next/server";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { listQuizQuestionsPublic } from "@/lib/academy/academy-db";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ moduleId: string }> | { moduleId: string } };

async function resolveParams(params: Ctx["params"]) {
  return typeof (params as Promise<{ moduleId: string }>).then === "function"
    ? await (params as Promise<{ moduleId: string }>)
    : (params as { moduleId: string });
}

/** Public quiz questions (no correct_index). */
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

  const questions = await listQuizQuestionsPublic(moduleId);
  return NextResponse.json({ questions });
}
