import type { Metadata } from "next";
import InstructorCertificatesClient from "@/components/academy/InstructorCertificatesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificates — Learn Dispatch" };

export default function AdminCertificatesPage() {
  return <InstructorCertificatesClient />;
}
