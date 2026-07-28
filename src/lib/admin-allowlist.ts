function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Merge env ADMIN_EMAILS with built-in fallbacks so setting Vercel env
 * cannot accidentally remove known instructor accounts.
 */
export function getAdminAllowlist(): string[] {
  const fallback = [
    "alphaassistant.alpha@gmail.com",
    "muhammadmikran.alpha@gmail.com",
    "mikran.dispatch@gmail.com",
    "sarmad.dispatch@gmail.com",
  ].map(normalize);

  const envRaw = process.env.ADMIN_EMAILS?.trim();
  const fromEnv = envRaw
    ? envRaw
        .split(",")
        .map((s) => normalize(s.replace(/^["']|["']$/g, "")))
        .filter(Boolean)
    : [];

  return Array.from(new Set([...fallback, ...fromEnv]));
}

export const SUPER_ADMIN_EMAILS = [
  "alphaassistant.alpha@gmail.com",
  "muhammadmikran.alpha@gmail.com",
] as const;

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new Set(getAdminAllowlist()).has(normalize(email));
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new Set(SUPER_ADMIN_EMAILS.map(normalize)).has(normalize(email));
}

export const ADMIN_LOGIN_HINT_EMAILS = [...SUPER_ADMIN_EMAILS];
