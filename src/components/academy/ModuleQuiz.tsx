"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Loader2, Lock, Sparkles, XCircle } from "lucide-react";

type Question = {
  id: string;
  question: string;
  options: string[];
  order_index: number;
};

type ReviewItem = {
  id: string;
  question: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
};

type GradeResult = {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  passMark: number;
  review: ReviewItem[];
  message?: string;
};

export function ModuleQuiz({ moduleId }: { moduleId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${moduleId}`);
      const body = (await res.json()) as {
        error?: string;
        locked?: boolean;
        message?: string;
        lastScore?: number | null;
        lastPassed?: boolean | null;
        review?: ReviewItem[] | null;
        attemptId?: string;
        questions?: Question[];
        passMark?: number;
      };
      if (!res.ok) throw new Error(body.error ?? "Could not load quiz");

      if (body.locked) {
        setLocked(true);
        setLockMessage(body.message ?? "Quiz locked");
        setQuestions([]);
        setAttemptId(null);
        if (body.review?.length) {
          setResult({
            score: body.lastScore ?? 0,
            passed: Boolean(body.lastPassed),
            total: body.review.length,
            correct: body.review.filter((r) => r.isCorrect).length,
            passMark: body.passMark ?? 70,
            review: body.review,
            message: body.message,
          });
        } else {
          setResult(null);
        }
        return;
      }

      setLocked(false);
      setLockMessage(null);
      setResult(null);
      setAttemptId(body.attemptId ?? null);
      setQuestions(body.questions ?? []);
      setAnswers({});
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
    if (!attemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quizzes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers }),
      });
      const body = (await res.json()) as GradeResult & {
        error?: string;
        locked?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Submit failed");
      setResult({
        score: body.score,
        passed: body.passed,
        total: body.total,
        correct: body.correct,
        passMark: body.passMark,
        review: body.review ?? [],
        message: body.message,
      });
      setLocked(Boolean(body.locked));
      setLockMessage(body.message ?? null);
      setQuestions([]);
      setAttemptId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
        Generating your 5 AI quiz questions…
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]"
        >
          Try again
        </button>
      </div>
    );
  }

  const review = result?.review ?? [];
  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

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
                  : " Review correct and incorrect answers below."}
              </p>
              {locked && !result.passed ? (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-100/90">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  {lockMessage ||
                    "Ask your instructor to assign a retake for a new AI-generated quiz."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {review.length > 0 ? (
        <ol className="space-y-5">
          {review.map((q, idx) => (
            <li
              key={q.id}
              className={clsx(
                "rounded-2xl border p-4",
                q.isCorrect
                  ? "border-emerald-500/35 bg-emerald-500/5"
                  : "border-red-500/35 bg-red-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {idx + 1}. {q.question}
                </p>
                {q.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-300" />
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isSelected = q.selectedIndex === optIdx;
                  const isCorrectOpt = q.correctIndex === optIdx;
                  return (
                    <li
                      key={optIdx}
                      className={clsx(
                        "rounded-lg px-2 py-1.5 text-sm",
                        isCorrectOpt && "bg-emerald-500/15 text-emerald-100",
                        isSelected && !isCorrectOpt && "bg-red-500/15 text-red-100",
                        !isSelected && !isCorrectOpt && "text-[var(--color-muted)]",
                      )}
                    >
                      {opt}
                      {isCorrectOpt ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                          Correct
                        </span>
                      ) : null}
                      {isSelected && !isCorrectOpt ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-red-300">
                          Your answer
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      ) : null}

      {!result && questions.length > 0 ? (
        <>
          <p className="text-xs text-[var(--color-muted)]">
            AI-generated quiz · 5 questions · pass ≥ 70%
          </p>
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
      ) : null}

      {!loading && !result && !questions.length && !error ? (
        <p className="text-sm text-[var(--color-muted)]">
          No quiz available for this module right now.
        </p>
      ) : null}
    </div>
  );
}
