/** Academy pricing — manual NayaPay (company account) until a card gateway is added. */

/** Company NayaPay account for Learn Dispatch fee collection */
export const NAYAPAY = {
  id: "imran.qamar7093@nayapay",
  accountNumber: "03216443914",
  accountDisplay: "0321 644 3914",
  iban: "PK34NAYA1234503216443914",
  accountTitle: "Imran Qamar Sandhu",
  label: "Alpha Solutions / Learn Dispatch — company account",
} as const;

/** @deprecated use NAYAPAY.accountNumber — kept for older imports */
export const NAYAPAY_NUMBER = NAYAPAY.accountNumber;
/** @deprecated use NAYAPAY.accountDisplay */
export const NAYAPAY_DISPLAY = NAYAPAY.accountDisplay;

export type EnrollmentPlan = "monthly" | "lifetime";

export const PLAN_PRICING: Record<
  EnrollmentPlan,
  { label: string; amountPkr: number; amountDisplay: string; summary: string }
> = {
  monthly: {
    label: "Monthly Access",
    amountPkr: 20_000,
    amountDisplay: "PKR 20,000",
    summary: "PKR 20,000 per month",
  },
  lifetime: {
    label: "2-Month Course Bundle",
    amountPkr: 34_000,
    amountDisplay: "PKR 34,000",
    summary: "PKR 34,000 one-time · 2 months access",
  },
};

export function planLabel(plan: string): string {
  if (plan === "monthly") return PLAN_PRICING.monthly.label;
  if (plan === "lifetime") return PLAN_PRICING.lifetime.label;
  return plan || "—";
}

export function planAmountDisplay(plan: EnrollmentPlan): string {
  return PLAN_PRICING[plan].summary;
}

/** Current monthly batch code, e.g. LD-2026-07 */
export function currentBatchCode(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `LD-${y}-${m}`;
}
