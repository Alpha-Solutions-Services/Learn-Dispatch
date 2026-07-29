import type { Metadata } from "next";
import InstructorQuizzesClient from "@/components/academy/InstructorQuizzesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assign quizzes — Learn Dispatch" };

export default function AdminQuizzesPage() {
  return <InstructorQuizzesClient />;
}
