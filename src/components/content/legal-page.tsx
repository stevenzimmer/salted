import { PageIntro } from "./page-intro";
import { legalContent } from "@/data/content-pages";

export function LegalPage({ kind }: { kind: keyof typeof legalContent }) {
  const content = legalContent[kind];
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow={
          kind === "privacy" ? "Privacy policy · draft" : "Terms of use · draft"
        }
        title={content.title}
        description={content.description}
      />
      <div className="legal-content">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
