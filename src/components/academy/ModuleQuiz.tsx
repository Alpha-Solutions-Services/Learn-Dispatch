"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type Question = {
  id: string;
  question: string;
  options: string[];
  order_index: number;
};

type GradeResult = {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  passMark: number;
};

export function ModuleQuiz({ moduleId }: { moduleId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${moduleId}`);
      const body = (await res.json()) as { error?: string; questions?: Question[] };
      if (!res.ok) throw new Error(body.error ?? "Could not load quiz");
      setQuestions(body.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, answers }),
      });
      const body = (await res.json()) as GradeResult & { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(body.error ?? "Submit failed");
      setResult({
        score: body.score,
        passed: body.passed,
        total: body.total,
        correct: body.correct,
        passMark: body.passMark,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading quiz…
      </div>
    );
  }

  if (!questions.length) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No quiz for this module yet. Your instructor will add questions soon.
      </p>
    );
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={clsx(
            "rounded-2xl border px-4 py-4",
            result.passed
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10",
          )}
        >
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 text-amber-300" />
            )}
            <div>
              <p className="font-semibold text-[var(--color-text)]">
                {result.passed ? "Passed" : "Not yet passed"} — {result.score}%
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {result.correct}/{result.total} correct. Pass mark is {result.passMark}%.
                {result.passed
                  ? " Module marked complete."
                  : " Review the lesson and try again."}
              </p>
              {!result.passed ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                >
                  Retry quiz
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <>
          <ol className="space-y-5">
            {questions.map((q, idx) => (
              <li
                key={q.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-4"
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {idx + 1}. {q.question}
                </p>
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <li key={optIdx}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--color-muted)]">
                        <input
                          type="radio"
                          className="mt-1 accent-[var(--color-accent)]"
                          name={q.id}
                          checked={answers[q.id] === optIdx}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[#041018] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit quiz
          </button>
        </>
      )}
    </div>
  );
}
