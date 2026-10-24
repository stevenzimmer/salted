import type { Metadata } from "next";
import { PageIntro } from "@/components/content/page-intro";
export const metadata: Metadata = {
  title: "Studio placeholder",
  robots: { index: false, follow: false },
};
export default function StudioPage() {
  return (
    <div className="shell min-h-[60vh] pb-24">
      <PageIntro
        eyebrow="Behind the bakery"
        title={"A little room\nfor what’s next."}
        description="This space is reserved for the future Sanity Studio. No CMS or administrative controls are installed in this preview."
      />
      <p className="draft-pill">Phase 1 · placeholder only</p>
    </div>
  );
}
