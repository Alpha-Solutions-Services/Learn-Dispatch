import { getAdminAllowlist } from "@/lib/admin-allowlist";
import { NAYAPAY } from "@/lib/academy/pricing";
import {
  getOpsNotifyEmails,
  resolveSmtpFromAddress,
  sendBrandedMail,
} from "@/lib/email/transport";
import { getAppUrl } from "@/lib/supabase/env";

const SUPPORT =
  process.env.ACADEMY_SUPPORT_EMAIL?.trim() || "info@alphasolutions.software";

function site() {
  return getAppUrl().replace(/\/$/, "");
}

function fromAcademy() {
  return resolveSmtpFromAddress(
    "Learn Dispatch <no-reply@alphasolutions.software>",
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Instructor / ops inboxes for Learn Dispatch alerts. */
export function getInstructorNotifyEmails(): string[] {
  const extra = process.env.ACADEMY_INSTRUCTOR_NOTIFY_EMAIL?.trim();
  const fromExtra = extra
    ? extra.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const fromOps = getOpsNotifyEmails().map((s) => s.trim().toLowerCase());
  const fromAdmin = getAdminAllowlist();
  return Array.from(new Set([...fromExtra, ...fromOps, ...fromAdmin]));
}

function cta(href: string, label: string) {
  return `<p style="margin:20px 0 8px"><a href="${href}" style="display:inline-block;padding:11px 18px;background:#38a3ff;color:#05080f;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;
}

export async function sendStudentWelcomeEmail(
  to: string,
  name: string,
  planSummary: string,
): Promise<void> {
  const base = site();
  await sendBrandedMail({
    to,
    from: fromAcademy(),
    subject: "Learn Dispatch — enrollment received (payment pending)",
    title: "Enrollment received",
    html: `<p>Hi ${escapeHtml(name)},</p>
      <p>Your Learn Dispatch enrollment is recorded (<strong>${escapeHtml(planSummary)}</strong>).</p>
      <p>Send payment via NayaPay to <strong>${NAYAPAY.accountDisplay}</strong> (${escapeHtml(NAYAPAY.accountTitle || "company account")}), then open your dashboard and tap <strong>I have paid</strong> so your instructor can verify.</p>
      ${cta(`${base}/login`, "Sign in to Learn Dispatch")}
      <p style="color:#6a8caf;font-size:13px">Questions? Contact ${escapeHtml(SUPPORT)}.</p>`,
  });

  await notifyInstructors({
    subject: `New enrollment — ${name}`,
    title: "New student enrollment",
    html: `<p><strong>${escapeHtml(name)}</strong> (${escapeHtml(to)}) enrolled for <strong>${escapeHtml(planSummary)}</strong>.</p>
      <p>Awaiting NayaPay payment / verification.</p>
      ${cta(`${base}/admin/enrollments`, "Open payments desk")}`,
  });
}

export async function notifyInstructors(opts: {
  subject: string;
  title: string;
  html: string;
}): Promise<void> {
  const to = getInstructorNotifyEmails();
  if (!to.length) return;
  await sendBrandedMail({
    to,
    from: fromAcademy(),
    subject: opts.subject,
    title: opts.title,
    html: opts.html,
  });
}

export async function sendPaymentClaimedEmail(opts: {
  studentEmail: string;
  studentName: string;
}): Promise<void> {
  const base = site();
  await notifyInstructors({
    subject: `Payment claimed — ${opts.studentName || opts.studentEmail}`,
    title: "Payment claim",
    html: `<p><strong>${escapeHtml(opts.studentName || "Student")}</strong> (${escapeHtml(opts.studentEmail)}) marked NayaPay as sent.</p>
      <p>Please verify and clear payment to unlock modules.</p>
      ${cta(`${base}/admin/enrollments`, "Verify payment")}`,
  });
}

export async function sendPaymentClearedEmail(opts: {
  studentEmail: string;
  studentName: string;
  planSummary?: string;
}): Promise<void> {
  const base = site();
  const name = opts.studentName || "Student";
  await sendBrandedMail({
    to: opts.studentEmail,
    from: fromAcademy(),
    subject: "Learn Dispatch — payment cleared, access unlocked",
    title: "Payment cleared",
    html: `<p>Hi ${escapeHtml(name)},</p>
      <p>Your payment has been verified${opts.planSummary ? ` for <strong>${escapeHtml(opts.planSummary)}</strong>` : ""}. Your learning path is unlocked.</p>
      ${cta(`${base}/student/dashboard`, "Open My learning")}
      <p style="color:#6a8caf;font-size:13px">Need help? Message your instructor from Instructor chat, or contact ${escapeHtml(SUPPORT)}.</p>`,
  });

  await notifyInstructors({
    subject: `Payment cleared — ${name}`,
    title: "Payment verified",
    html: `<p>Access unlocked for <strong>${escapeHtml(name)}</strong> (${escapeHtml(opts.studentEmail)}).</p>
      ${cta(`${base}/admin/enrollments`, "Open instructor desk")}`,
  });
}

export async function sendQuizAssignedEmail(opts: {
  studentEmail: string;
  studentName: string;
  moduleTitle: string;
  note?: string | null;
  dueAt?: string | null;
}): Promise<void> {
  const base = site();
  const name = opts.studentName || "Student";
  const due = opts.dueAt
    ? `<p>Due: <strong>${escapeHtml(new Date(opts.dueAt).toLocaleString())}</strong></p>`
    : "";
  const note = opts.note
    ? `<p style="color:#6a8caf">Instructor note: ${escapeHtml(opts.note)}</p>`
    : "";

  await sendBrandedMail({
    to: opts.studentEmail,
    from: fromAcademy(),
    subject: `Quiz assigned — ${opts.moduleTitle}`,
    title: "Quiz assigned",
    html: `<p>Hi ${escapeHtml(name)},</p>
      <p>Your instructor assigned a quiz for <strong>${escapeHtml(opts.moduleTitle)}</strong>.</p>
      ${due}${note}
      ${cta(`${base}/student/dashboard`, "Open learning path")}`,
  });
}

export async function sendCertificateIssuedEmail(opts: {
  studentEmail: string;
  studentName: string;
  certificateNo: string;
}): Promise<void> {
  const base = site();
  const name = opts.studentName || "Student";
  await sendBrandedMail({
    to: opts.studentEmail,
    from: fromAcademy(),
    subject: `Certificate issued — ${opts.certificateNo}`,
    title: "Certificate issued",
    html: `<p>Hi ${escapeHtml(name)},</p>
      <p>Congratulations — your Learn Dispatch certificate <strong>${escapeHtml(opts.certificateNo)}</strong> is ready.</p>
      ${cta(`${base}/student/certificates`, "View certificates")}`,
  });

  await notifyInstructors({
    subject: `Certificate issued — ${name}`,
    title: "Certificate issued",
    html: `<p>Certificate <strong>${escapeHtml(opts.certificateNo)}</strong> issued to <strong>${escapeHtml(name)}</strong> (${escapeHtml(opts.studentEmail)}).</p>
      ${cta(`${base}/admin/certificates`, "Open certificates")}`,
  });
}

export async function notifyInstructorStudentMessage(opts: {
  studentEmail?: string | null;
  studentName?: string | null;
  preview: string;
  threadId: string;
}): Promise<void> {
  const base = site();
  const who =
    opts.studentName || opts.studentEmail || "A student";
  const preview = escapeHtml(opts.preview.slice(0, 280));
  await notifyInstructors({
    subject: `Student message — ${who}`,
    title: "Student message",
    html: `<p><strong>${escapeHtml(who)}</strong>${opts.studentEmail && opts.studentName ? ` (${escapeHtml(opts.studentEmail)})` : ""} sent a chat message.</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #38a3ff;background:#0f1829;color:#edf2f8">${preview}</blockquote>
      ${cta(`${base}/admin/inbox`, "Open student inbox")}`,
  });
}

export async function notifyStudentInstructorReply(opts: {
  studentEmail: string;
  preview: string;
}): Promise<void> {
  const base = site();
  const preview = escapeHtml(opts.preview.slice(0, 280));
  await sendBrandedMail({
    to: opts.studentEmail,
    from: fromAcademy(),
    subject: "New message from your Learn Dispatch instructor",
    title: "Instructor reply",
    html: `<p>You have a new message from your instructor.</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #38a3ff;background:#0f1829;color:#edf2f8">${preview}</blockquote>
      ${cta(`${base}/student/messages`, "Open Instructor chat")}`,
  });
}
