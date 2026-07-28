import type { Metadata } from "next";
import { CourseLanding } from "@/components/course/CourseLanding";
import { COURSE } from "@/lib/course/curriculum";

export const metadata: Metadata = {
  title: `${COURSE.product} — ${COURSE.title}`,
  description: COURSE.tagline,
  applicationName: COURSE.product,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${COURSE.product} | ${COURSE.brand}`,
    description: COURSE.tagline,
    url: "https://learndispatch.alphasolutions.software/",
    type: "website",
  },
};

export default function HomePage() {
  return <CourseLanding />;
}
