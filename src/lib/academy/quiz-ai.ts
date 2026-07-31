import { randomUUID } from "crypto";
import Groq from "groq-sdk";
import { sanitizeText } from "@/lib/academy/api-security";

export type AiQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
};

function getGroq() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  return new Groq({ apiKey: key });
}

function parseQuestionsJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(body) as unknown;
}

function normalizeQuestions(raw: unknown): AiQuizQuestion[] | null {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions)
      ? (raw as { questions: unknown[] }).questions
      : null;
  if (!list || list.length < 5) return null;

  const out: AiQuizQuestion[] = [];
  for (const item of list.slice(0, 5)) {
    if (!item || typeof item !== "object") return null;
    const q = item as Record<string, unknown>;
    const question = sanitizeText(String(q.question ?? ""), 400);
    const optionsRaw = Array.isArray(q.options) ? q.options : [];
    const options = optionsRaw
      .slice(0, 4)
      .map((o) => sanitizeText(String(o ?? ""), 200))
      .filter(Boolean);
    const correct_index = Number(q.correct_index);
    if (!question || options.length !== 4) return null;
    if (!Number.isInteger(correct_index) || correct_index < 0 || correct_index > 3) {
      return null;
    }
    out.push({
      id: randomUUID(),
      question,
      options,
      correct_index,
    });
  }
  return out.length === 5 ? out : null;
}

async function generateOnce(params: {
  title: string;
  summary: string | null;
  contentMd: string | null;
}): Promise<AiQuizQuestion[] | null> {
  const groq = getGroq();
  if (!groq) return null;

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const excerpt = sanitizeText(
    [params.summary ?? "", params.contentMd ?? ""].join("\n\n"),
    3500,
  );

  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.85,
    max_tokens: 2200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write Learn Dispatch (US truck dispatch) module quizzes for Alpha Freight Network.
Return ONLY valid JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0}]}
Rules:
- Exactly 5 questions
- Exactly 4 short options each
- correct_index is 0-based (0-3)
- Practical, accurate dispatch knowledge — no trick wording
- Vary difficulty; do not copy text verbatim from the lesson`,
      },
      {
        role: "user",
        content: `Create a NEW unique 5-question MCQ quiz for this module.

Title: ${params.title}

Lesson material:
${excerpt || "(Use general professional truck dispatch knowledge for this module title.)"}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) return null;
  try {
    return normalizeQuestions(parseQuestionsJson(text));
  } catch {
    return null;
  }
}

/** Generate exactly 5 MCQs for a module. Retries once on invalid JSON. */
export async function generateModuleQuizQuestions(params: {
  title: string;
  summary: string | null;
  contentMd: string | null;
}): Promise<AiQuizQuestion[]> {
  const first = await generateOnce(params);
  if (first) return first;
  const second = await generateOnce(params);
  if (second) return second;
  throw new Error(
    "Could not generate quiz questions right now. Please try again in a moment.",
  );
}

export function stripCorrectIndex(
  questions: AiQuizQuestion[],
): { id: string; question: string; options: string[]; order_index: number }[] {
  return questions.map((q, i) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    order_index: i,
  }));
}
