import {
  createConfiguredTransporter,
  resolveSmtpFromAddress,
} from "@/lib/email/transport";

const SUPPORT = process.env.ACADEMY_SUPPORT_EMAIL?.trim() || "info@alphasolutions.software";
const SITE = process.env.NEXT_PUBLIC_LEARN_DISPATCH_URL?.trim() || "https://learndispatch.alphasolutions.software";

export async function sendStudentWelcomeEmail(
  to: string,
  name: string,
  planSummary: string,
): Promise<void> {
  const transporter = createConfiguredTransporter();
  const from = resolveSmtpFromAddress("Learn Dispatch <no-reply@alphasolutions.software>");
  if (!transporter || !from) return;

  const html = `
    <p>Hi ${name},</p>
    <p>Your Learn Dispatch enrollment is recorded (${planSummary}).</p>
    <p>Send payment via NayaPay to <strong>03217112944</strong>, then open your dashboard and tap <strong>I have paid</strong> so our team can verify.</p>
    <p><a href="${SITE}/login">Sign in to Learn Dispatch</a></p>
    <p>Questions? Reply to this email or contact ${SUPPORT}.</p>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: "Learn Dispatch — enrollment received (payment pending)",
    html,
    text: `Hi ${name}, enrollment received. Pay via NayaPay 03217112944 then sign in at ${SITE}/login`,
  }).catch((err) => console.error("[academy-email]", err));
}
