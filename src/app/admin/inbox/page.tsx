import type { Metadata } from "next";
import InstructorInboxClient from "@/components/academy/InstructorInboxClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student inbox — Learn Dispatch",
};

export default function AdminInboxPage() {
  return <InstructorInboxClient />;
}
