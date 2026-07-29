/** Public origin for Learn Dispatch only — never fall back to Client Portal. */
export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_LEARN_DISPATCH_URL?.trim() ||
    "https://learndispatch.alphasolutions.software"
  );
}

/** @deprecated Prefer getAppUrl — Portal helpers shared by mistake used this name. */
export function getPortalUrl() {
  return getAppUrl();
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.alphasolutions.software"
  );
}

export function getAuthCallbackUrl(origin?: string) {
  const base = (origin?.replace(/\/$/, "") || getAppUrl().replace(/\/$/, ""));
  return `${base}/auth/callback`;
}

export function isPortalAuthConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (!url.startsWith("http")) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  if (key === "your_anon_key" || key.length < 20) return false;
  return true;
}
