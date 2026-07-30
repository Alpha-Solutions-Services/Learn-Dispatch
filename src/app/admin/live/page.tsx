import type { Metadata } from "next";
import InstructorLiveClient from "@/components/academy/InstructorLiveClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live sessions — Instructor" };

export default function AdminLivePage() {
  return <InstructorLiveClient />;
}
