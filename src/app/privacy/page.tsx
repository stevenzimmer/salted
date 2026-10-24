import type { Metadata } from "next";
import { LegalPage } from "@/components/content/legal-page";
export const metadata: Metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
};
export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
