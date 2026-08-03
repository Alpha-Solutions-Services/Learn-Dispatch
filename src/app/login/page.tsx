import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LoginForm } from "@/components/auth/LoginForm";
import { isPaidAccessActive } from "@/lib/academy/paid-access";
import { canManageAcademy } from "@/lib/academy/staff-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveDestination(user: User, wantsInstructor: boolean) {
  if (wantsInstructor && (await canManageAcademy(user))) {
    return "/admin/enrollments";
  }

  const sb = await createClient();
  if (!sb) return "/login";

  const { data: profile } = await sb
    .from("profiles")
    .select("role, enrollment_status, paid_until")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "instructor" || profile?.role === "dispatcher") {
    return "/admin/enrollments";
  }
  if (profile?.role === "student") {
    if (wantsInstructor) {
      return "/login?role=instructor&error=unauthorized&reason=unauthorized_instructor";
    }
    return isPaidAccessActive(profile)
      ? "/student/dashboard"
      : "/enroll?reason=payment";
  }
  if (await canManageAcademy(user)) {
    return "/admin/enrollments";
  }
  return "/enroll";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { role?: string; error?: string; reason?: string };
}) {
  const wantsInstructor =
    searchParams.role === "instructor" || searchParams.role === "admin";

  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };

  if (user?.id) {
    redirect(await resolveDestination(user, wantsInstructor));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(56,163,255,0.12),_transparent_55%)] px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm defaultAdmin={wantsInstructor} />
      </Suspense>
    </main>
  );
}
