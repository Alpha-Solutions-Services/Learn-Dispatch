import type { Metadata } from "next";
import StudentEnroll from "@/components/academy/StudentEnroll";
import { resolveSearchParams } from "@/lib/next/resolve-search-params";

export const metadata: Metadata = {
  title: "Enroll — Learn Dispatch",
  description: "Enroll in dispatch training. Pay PKR 20,000/month or PKR 34,000 for the 2-month bundle via NayaPay.",
};

export default async function EnrollPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }> | { reason?: string };
}) {
  const sp = await resolveSearchParams(searchParams);
  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <StudentEnroll initialReason={sp?.reason} />
    </main>
  );
}
