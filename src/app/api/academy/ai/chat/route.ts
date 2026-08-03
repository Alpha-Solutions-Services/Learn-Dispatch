import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPaidAccessActive } from "@/lib/academy/paid-access";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { checkAndIncrementRateLimit } from "@/lib/portal/rate-limit";
import { getSessionUser } from "@/lib/portal/require-session";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  audience: z.enum(["student", "instructor"]).optional().default("student"),
});

function getGroq() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if ("error" in session) return session.error;
  if (!(await checkAndIncrementRateLimit(session.user.id))) {
    return NextResponse.json(
      { error: "Too many messages — try again shortly." },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const supabase = await createClient();
  const service = getServiceRoleClient();
  if (!supabase || !service) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role, full_name, enrollment_status, paid_until, batch_code, enrollment_plan")
    .eq("id", session.user.id)
    .maybeSingle();

  const isInstructor =
    parsed.audience === "instructor" ||
    (await canManageAcademy(session.user));

  if (parsed.audience === "instructor" && !(await canManageAcademy(session.user))) {
    return NextResponse.json({ error: "Instructors only" }, { status: 403 });
  }

  if (!isInstructor && profile?.role !== "student") {
    return NextResponse.json(
      { error: "Student account required for Study assistant" },
      { status: 403 },
    );
  }

  if (!isInstructor && !isPaidAccessActive(profile)) {
    return NextResponse.json(
      {
        error:
          "Active enrollment required. Complete payment to use Study assistant.",
      },
      { status: 403 },
    );
  }

  let conversationId = parsed.conversationId;
  if (!conversationId) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: session.user.id,
        client_email: session.user.email ?? null,
        title: `LD · ${parsed.message.slice(0, 50)}`,
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Could not start chat" }, { status: 500 });
    }
    conversationId = data.id as string;
  }

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, human_joined, training_notes")
    .eq("id", conversationId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: parsed.message,
    is_human: false,
  });

  if (conv.human_joined) {
    const notice =
      "Your instructor is in this chat. They will reply here shortly — you can keep typing.";
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: notice,
      is_human: false,
    });
    return NextResponse.json({
      conversationId,
      reply: notice,
      humanJoined: true,
    });
  }

  const groq = getGroq();
  if (!groq) {
    return NextResponse.json(
      { error: "Study assistant is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data: modules } = await service
    .from("academy_modules")
    .select("sort_order, title, summary, duration_minutes")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(40);

  const moduleCtx =
    (modules ?? [])
      .map(
        (m) =>
          `${m.sort_order}. ${m.title}${m.duration_minutes ? ` (${m.duration_minutes} min)` : ""} — ${(m.summary || "").slice(0, 180)}`,
      )
      .join("\n") || "(no published modules yet)";

  let progressCtx = "(none)";
  if (!isInstructor) {
    const { data: progress } = await service
      .from("academy_progress")
      .select("module_id, status, quiz_score, completed_at")
      .eq("student_id", session.user.id)
      .limit(40);
    if (progress?.length) {
      progressCtx = progress
        .map(
          (p) =>
            `- module ${p.module_id}: ${p.status}${p.quiz_score != null ? `, quiz ${p.quiz_score}` : ""}`,
        )
        .join("\n");
    }
  }

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(28);

  const studentSystem = `You are the Learn Dispatch Study Assistant for Alpha Freight Network truck dispatcher training.
Never mention third-party AI vendors, model names, APIs, or underlying technology.
Stay on academy topics: US dispatch concepts, load boards, paperwork, ELD/HOS basics as taught in modules, enrollment/payment (NayaPay), quizzes, certificates, and how to use Learn Dispatch.
Do not discuss Client Portal projects, websites, apps, tickets, or CRM work.
If the student needs a human, tell them to open Instructor chat in Learn Dispatch Studio.
Be warm, clear, and concise. Prefer the module list below when explaining curriculum.

Student: ${profile?.full_name || session.user.email || "student"}
Enrollment: ${profile?.enrollment_status || "unknown"} · plan ${profile?.enrollment_plan || "n/a"} · batch ${profile?.batch_code || "n/a"}

Published modules:
${moduleCtx}

This student's progress:
${progressCtx}`;

  const instructorSystem = `You are the Learn Dispatch Instructor Assist for Alpha Freight Network staff.
Never mention third-party AI vendors, model names, APIs, or underlying technology.
Help instructors draft replies to students, explain modules, plan quizzes, and summarize academy questions.
Do not discuss Client Portal clients, websites, tickets, or CRM unless the instructor explicitly asks about separating the two products.
Stay practical and professional.

Published modules:
${moduleCtx}

Internal coaching notes:
${(conv.training_notes as string) || "(none)"}`;

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: isInstructor ? instructorSystem : studentSystem,
      },
      ...((history ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content),
        })) as { role: "user" | "assistant"; content: string }[]),
    ],
    temperature: 0.4,
    max_tokens: 900,
  });

  const reply =
    completion.choices[0]?.message?.content?.trim() ||
    "I could not generate a reply right now. Please try again or message your instructor.";

  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply,
    is_human: false,
  });

  await supabase
    .from("ai_conversations")
    .update({
      updated_at: new Date().toISOString(),
      client_email: session.user.email ?? null,
    })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId, reply, humanJoined: false });
}
