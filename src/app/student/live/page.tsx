import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudentLiveClient from "@/components/academy/StudentLiveClient";
import { getStudentPaidAccess, isPaidAccessActive } from "@/lib/academy/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live sessions — Learn Dispatch" };

export default async function StudentLivePage() {
  const sb = await createClient();
  const {
    data: { user },
  } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!user?.id) redirect("/login");
  const access = await getStudentPaidAccess(user.id);
  if (!isPaidAccessActive(access)) redirect("/enroll?reason=payment");
  return <StudentLiveClient />;
}
