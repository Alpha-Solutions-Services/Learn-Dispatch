import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { markChallanPaid } from "@/lib/academy/challan";
import { sanitizeText } from "./api-security";

export type AcademyStudentRow = {
  id: string;
  email: string;
  fullName: string;
  enrollmentStatus: string;
  enrollmentPlan: string;
  enrolledAt: string | null;
  paymentConfirmedAt: string | null;
  paymentNotes: string;
  paymentMethod: string | null;
  paidUntil: string | null;
  paymentReference: string | null;
  whatsappPhone: string | null;
  batchCode: string | null;
};

const STUDENT_SELECT =
  "id,email,full_name,enrollment_status,enrollment_plan,enrolled_at,payment_confirmed_at,payment_notes,payment_method,paid_until,payment_reference,whatsapp_phone,batch_code";

function mapStudentRow(row: Record<string, unknown>): AcademyStudentRow {
  return {
    id: row.id as string,
    email: (row.email as string) ?? "",
    fullName: (row.full_name as string) ?? "",
    enrollmentStatus: (row.enrollment_status as string) ?? "unpaid",
    enrollmentPlan: (row.enrollment_plan as string) ?? "",
    enrolledAt: (row.enrolled_at as string) ?? null,
    paymentConfirmedAt: (row.payment_confirmed_at as string) ?? null,
    paymentNotes: (row.payment_notes as string) ?? "",
    paymentMethod: (row.payment_method as string) ?? null,
    paidUntil: (row.paid_until as string) ?? null,
    paymentReference: (row.payment_reference as string) ?? null,
    whatsappPhone: (row.whatsapp_phone as string) ?? null,
    batchCode: (row.batch_code as string) ?? null,
  };
}

export async function logPaymentAudit(params: {
  studentId: string;
  action: "claimed_paid" | "verified" | "rejected" | "expired" | "reset";
  actorId?: string | null;
  note?: string;
}) {
  const admin = getServiceRoleClient();
  if (!admin) return;
  const { error } = await admin.from("payment_audit_log").insert({
    student_id: params.studentId,
    action: params.action,
    actor_id: params.actorId ?? null,
    note: params.note ? sanitizeText(params.note, 500) : null,
  });
  if (error) {
    console.error("[payment-audit] insert failed:", error);
  }
}

export async function listAcademyStudents(filter?: {
  status?: string;
}): Promise<AcademyStudentRow[]> {
  const admin = getServiceRoleClient();
  if (!admin) return [];

  let query = admin
    .from("profiles")
    .select(STUDENT_SELECT)
    .eq("role", "student")
    .order("enrolled_at", { ascending: false, nullsFirst: false });

  if (filter?.status) {
    query = query.eq("enrollment_status", filter.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[academy-students] list failed:", error);
    return [];
  }

  return (data ?? []).map((row) => mapStudentRow(row as Record<string, unknown>));
}

export async function setStudentEnrollmentStatus(params: {
  studentId: string;
  status: "pending" | "paid" | "unpaid" | "refunded" | "expired";
  confirmedBy: string;
  notes?: string;
}): Promise<AcademyStudentRow | null> {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const patch: Record<string, unknown> = {
    enrollment_status: params.status,
    payment_notes: params.notes ? sanitizeText(params.notes, 500) : null,
  };

  if (params.status === "paid") {
    patch.payment_confirmed_at = new Date().toISOString();
    patch.payment_confirmed_by = params.confirmedBy;
    patch.payment_method = "naya_pay";
  }

  if (params.status === "unpaid" || params.status === "pending") {
    patch.payment_confirmed_at = null;
    patch.payment_confirmed_by = null;
  }

  const { data, error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", params.studentId)
    .eq("role", "student")
    .select(STUDENT_SELECT)
    .maybeSingle();

  if (error || !data) {
    console.error("[academy-students] update failed:", error);
    return null;
  }

  const action =
    params.status === "paid"
      ? "verified"
      : params.status === "expired"
        ? "expired"
        : params.status === "refunded" || params.status === "unpaid"
          ? "rejected"
          : "reset";

  await logPaymentAudit({
    studentId: params.studentId,
    action,
    actorId: params.confirmedBy,
    note: params.notes,
  });

  if (params.status === "paid") {
    await markChallanPaid(params.studentId, params.confirmedBy);
  }

  return mapStudentRow(data as Record<string, unknown>);
}

export async function listPublishedModules() {
  const admin = getServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("academy_modules")
    .select("id,sort_order,title,summary,is_published")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[academy-modules] list failed:", error);
    return [];
  }
  return data ?? [];
}

export async function listStudentProgress(studentId: string) {
  const admin = getServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("academy_progress")
    .select("id,module_id,status,instructor_note,quiz_score,completed_at,updated_at")
    .eq("student_id", studentId);

  if (error) {
    console.error("[academy-progress] list failed:", error);
    return [];
  }
  return data ?? [];
}

export async function upsertStudentProgress(params: {
  studentId: string;
  moduleId: string;
  status: "not_started" | "in_progress" | "completed";
  instructorNote?: string;
}) {
  const admin = getServiceRoleClient();
  if (!admin) return false;

  const { error } = await admin.from("academy_progress").upsert(
    {
      student_id: params.studentId,
      module_id: params.moduleId,
      status: params.status,
      instructor_note: params.instructorNote
        ? sanitizeText(params.instructorNote, 500)
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,module_id" },
  );

  if (error) {
    console.error("[academy-progress] upsert failed:", error);
    return false;
  }
  return true;
}

export async function addStudentNote(params: {
  studentId: string;
  authorId: string;
  body: string;
}) {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("academy_student_notes")
    .insert({
      student_id: params.studentId,
      author_id: params.authorId,
      body: sanitizeText(params.body, 2000),
    })
    .select("id,created_at,body,author_id")
    .single();

  if (error) {
    console.error("[academy-notes] insert failed:", error);
    return null;
  }
  return data;
}

export async function listStudentNotes(studentId: string) {
  const admin = getServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("academy_student_notes")
    .select("id,created_at,body,author_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[academy-notes] list failed:", error);
    return [];
  }
  return data ?? [];
}

export type AcademyModuleDetail = {
  id: string;
  sort_order: number;
  title: string;
  summary: string | null;
  content_md: string | null;
  video_url: string | null;
  video_provider: string | null;
  duration_minutes: number | null;
  is_published: boolean;
};

/** Returns module metadata. Includes video_url only when includeVideo=true (caller must gate access). */
export async function getPublishedModuleById(
  moduleId: string,
  opts?: { includeVideo?: boolean },
): Promise<AcademyModuleDetail | null> {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("academy_modules")
    .select(
      "id,sort_order,title,summary,content_md,video_url,video_provider,duration_minutes,is_published",
    )
    .eq("id", moduleId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[academy-modules] get failed:", error);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    sort_order: (row.sort_order as number) ?? 0,
    title: (row.title as string) ?? "",
    summary: (row.summary as string) ?? null,
    content_md: (row.content_md as string) ?? null,
    // Strip video_url unless caller explicitly requested it (paid-access gate).
    video_url: opts?.includeVideo ? ((row.video_url as string) ?? null) : null,
    video_provider: (row.video_provider as string) ?? null,
    duration_minutes: (row.duration_minutes as number) ?? null,
    is_published: Boolean(row.is_published),
  };
}

export type QuizQuestionPublic = {
  id: string;
  question: string;
  options: string[];
  order_index: number;
};

export async function listQuizQuestionsPublic(
  moduleId: string,
): Promise<QuizQuestionPublic[]> {
  const admin = getServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("quiz_questions")
    .select("id,question,options,order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("[quiz-questions] list failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    question: row.question as string,
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    order_index: (row.order_index as number) ?? 0,
  }));
}

export async function gradeQuizSubmission(params: {
  studentId: string;
  moduleId: string;
  answers: Record<string, number>;
}): Promise<{ score: number; passed: boolean; total: number; correct: number } | null> {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("quiz_questions")
    .select("id,correct_index")
    .eq("module_id", params.moduleId);

  if (error || !data?.length) {
    if (error) console.error("[quiz] grade fetch failed:", error);
    return null;
  }

  let correct = 0;
  for (const q of data) {
    const id = q.id as string;
    const expected = q.correct_index as number;
    if (params.answers[id] === expected) correct += 1;
  }

  const total = data.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= 70;
  const now = new Date().toISOString();

  const { error: upErr } = await admin.from("academy_progress").upsert(
    {
      student_id: params.studentId,
      module_id: params.moduleId,
      status: passed ? "completed" : "in_progress",
      quiz_score: score,
      completed_at: passed ? now : null,
      updated_at: now,
    },
    { onConflict: "student_id,module_id" },
  );

  if (upErr) {
    console.error("[quiz] progress upsert failed:", upErr);
    return null;
  }

  return { score, passed, total, correct };
}
