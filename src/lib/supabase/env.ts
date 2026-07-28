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

/** Public origin for this app (Learn Dispatch). */
export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_LEARN_DISPATCH_URL?.trim() ||
    process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
    "https://learndispatch.alphasolutions.software"
  );
}

/** @deprecated Use getAppUrl — kept for Portal-copied helpers */
export function getPortalUrl() {
  return getAppUrl();
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.alphasolutions.software"
  );
}

export function getAuthCallbackUrl() {
  return `${getAppUrl().replace(/\/$/, "")}/auth/callback`;
}
