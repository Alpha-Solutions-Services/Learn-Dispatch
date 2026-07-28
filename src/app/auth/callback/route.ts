import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canManageAcademy } from "@/lib/academy/staff-auth";

export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/student/dashboard";
}

function loginError(origin: string, reason: string, cookies: CookieToSet[] = [], admin = false) {
  const q = new URLSearchParams({ error: "auth", reason });
  if (admin) q.set("role", "admin");
  const res = NextResponse.redirect(`${origin}/login?${q.toString()}`);
  for (const c of cookies) {
    res.cookies.set(c.name, c.value, c.options);
  }
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const oauthDesc = url.searchParams.get("error_description");
  const next = safeNextPath(url.searchParams.get("next"));
  const wantsAdmin = next.startsWith("/admin");

  if (oauthError) {
    return loginError(origin, oauthDesc || oauthError, [], wantsAdmin);
  }
  if (!code) {
    return loginError(origin, "missing_code", [], wantsAdmin);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anon) {
    return loginError(origin, "missing_supabase_env", [], wantsAdmin);
  }

  const cookiesToSet: CookieToSet[] = [];
  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return loginError(origin, exchangeError.message, cookiesToSet, wantsAdmin);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return loginError(origin, "session_missing_after_exchange", cookiesToSet, wantsAdmin);
  }

  if (wantsAdmin && !(await canManageAcademy(user))) {
    await supabase.auth.signOut();
    return loginError(origin, "not_admin", cookiesToSet, true);
  }

  let dest = next;
  if (next === "/student/dashboard" || next === "/enroll") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, enrollment_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "student") {
      dest = profile.enrollment_status === "paid" ? "/student/dashboard" : "/enroll";
    } else if (await canManageAcademy(user)) {
      dest = "/admin/enrollments";
    }
  }

  const response = NextResponse.redirect(`${origin}${dest}`);
  for (const c of cookiesToSet) {
    response.cookies.set(c.name, c.value, c.options);
  }
  return response;
}
