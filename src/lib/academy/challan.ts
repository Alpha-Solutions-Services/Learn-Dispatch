import { NAYAPAY, PLAN_PRICING, currentBatchCode, type EnrollmentPlan } from "@/lib/academy/pricing";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

function challanNumber(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LD-${stamp}-${rand}`;
}

export type FeeChallanRow = {
  id: string;
  challan_no: string;
  student_id: string;
  batch_code: string | null;
  plan: string;
  amount_pkr: number;
  status: string;
  student_name: string;
  student_email: string;
  whatsapp_phone: string | null;
  nayapay_account: string | null;
  nayapay_iban: string | null;
  created_at: string;
};

export async function ensureBatch(code = currentBatchCode()) {
  const admin = getServiceRoleClient();
  if (!admin) return code;
  const label = `Batch ${new Date().toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`;
  const starts = new Date();
  starts.setUTCDate(1);
  await admin.from("academy_batches").upsert(
    {
      code,
      label,
      starts_on: starts.toISOString().slice(0, 10),
    },
    { onConflict: "code" },
  );
  return code;
}

export async function createFeeChallan(params: {
  studentId: string;
  plan: EnrollmentPlan;
  studentName: string;
  studentEmail: string;
  whatsappPhone?: string | null;
}): Promise<FeeChallanRow | null> {
  const admin = getServiceRoleClient();
  if (!admin) return null;

  const batch = await ensureBatch();
  const amount = PLAN_PRICING[params.plan].amountPkr;
  const row = {
    challan_no: challanNumber(),
    student_id: params.studentId,
    batch_code: batch,
    plan: params.plan,
    amount_pkr: amount,
    status: "unpaid",
    student_name: params.studentName,
    student_email: params.studentEmail.toLowerCase(),
    whatsapp_phone: params.whatsappPhone ?? null,
    nayapay_account: NAYAPAY.accountNumber,
    nayapay_iban: NAYAPAY.iban,
  };

  const { data, error } = await admin
    .from("fee_challans")
    .insert(row)
    .select(
      "id,challan_no,student_id,batch_code,plan,amount_pkr,status,student_name,student_email,whatsapp_phone,nayapay_account,nayapay_iban,created_at",
    )
    .single();

  if (error || !data) {
    console.error("[fee-challan] create failed:", error);
    return null;
  }

  await admin
    .from("profiles")
    .update({
      batch_code: batch,
      whatsapp_phone: params.whatsappPhone ?? null,
      payment_method: "naya_pay",
    })
    .eq("id", params.studentId);

  return data as FeeChallanRow;
}

export async function markChallanPending(studentId: string) {
  const admin = getServiceRoleClient();
  if (!admin) return;
  await admin
    .from("fee_challans")
    .update({ status: "pending" })
    .eq("student_id", studentId)
    .in("status", ["unpaid", "pending"]);
}

export async function markChallanPaid(studentId: string, verifiedBy: string) {
  const admin = getServiceRoleClient();
  if (!admin) return;
  const now = new Date().toISOString();
  await admin
    .from("fee_challans")
    .update({
      status: "paid",
      paid_at: now,
      verified_by: verifiedBy,
      verified_at: now,
    })
    .eq("student_id", studentId)
    .in("status", ["unpaid", "pending"]);
}

export async function getLatestChallanForStudent(studentId: string) {
  const admin = getServiceRoleClient();
  if (!admin) return null;
  const { data } = await admin
    .from("fee_challans")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export function challanHtml(challan: FeeChallanRow): string {
  const amount = `PKR ${Number(challan.amount_pkr).toLocaleString("en-PK")}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Fee Challan ${challan.challan_no}</title>
<style>
  body{font-family:Georgia,serif;background:#f4f7fb;color:#0b1220;padding:32px}
  .sheet{max-width:720px;margin:0 auto;background:#fff;border:1px solid #c5d4e8;padding:32px}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#5a6f88;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
  td{padding:10px 8px;border-bottom:1px solid #e6eef8;vertical-align:top}
  td:first-child{width:40%;color:#5a6f88}
  .stamp{margin-top:28px;padding:12px;border:2px dashed #38a3ff;color:#0b4a7a;font-weight:bold;text-align:center}
  @media print{body{background:#fff;padding:0}.sheet{border:none}}
</style>
</head>
<body>
  <div class="sheet">
    <h1>Learn Dispatch — Fee Challan</h1>
    <p class="muted">Alpha Freight Network · Alpha Solutions</p>
    <table>
      <tr><td>Challan No.</td><td><strong>${challan.challan_no}</strong></td></tr>
      <tr><td>Student</td><td>${challan.student_name}<br/><span class="muted">${challan.student_email}</span></td></tr>
      <tr><td>WhatsApp</td><td>${challan.whatsapp_phone || "—"}</td></tr>
      <tr><td>Batch</td><td>${challan.batch_code || "—"}</td></tr>
      <tr><td>Plan</td><td>${challan.plan}</td></tr>
      <tr><td>Amount due</td><td><strong>${amount}</strong></td></tr>
      <tr><td>Pay to (NayaPay)</td><td>
        ${NAYAPAY.accountTitle}<br/>
        ID: ${NAYAPAY.id}<br/>
        Account: ${NAYAPAY.accountDisplay}<br/>
        IBAN: ${NAYAPAY.iban}
      </td></tr>
      <tr><td>Status</td><td>${challan.status.toUpperCase()}</td></tr>
      <tr><td>Issued</td><td>${new Date(challan.created_at).toLocaleString()}</td></tr>
    </table>
    <div class="stamp">NON-REFUNDABLE FEE · Submit via company NayaPay only · Keep this challan for verification</div>
    <p class="muted" style="margin-top:16px">After payment, mark “I have paid” in your enrollment screen. Instructors verify against this challan.</p>
  </div>
</body>
</html>`;
}
