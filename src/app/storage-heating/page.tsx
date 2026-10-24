import type { Metadata } from "next";
import { PageIntro } from "@/components/content/page-intro";
import { storageContent } from "@/data/content-pages";

export const metadata: Metadata = {
  title: "Storage + reheating",
  description:
    "The future Salted bread care guide. Bakery-approved storage and reheating details are coming soon.",
  alternates: { canonical: "/storage-heating" },
};

export default function StoragePage() {
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow="Don’t ruin good focaccia"
        title={storageContent.title}
        description={storageContent.description}
      />
      <p className="draft-pill">
        Draft guide · instructions awaiting bakery approval
      </p>
      <div className="storage-guide">
        {storageContent.sections.map((section, index) => (
          <section key={section.title}>
            <span className="step-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
