/** Academy pricing — manual NayaPay until a card gateway is added. */
export const NAYAPAY_NUMBER = "03217112944";
export const NAYAPAY_DISPLAY = "0321 711 2944";

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
