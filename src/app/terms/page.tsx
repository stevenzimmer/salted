import type { Metadata } from "next";
import { LegalPage } from "@/components/content/legal-page";
export const metadata: Metadata = {
  title: "Terms",
  alternates: { canonical: "/terms" },
};
export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
