import { PageIntro } from "@/components/content/page-intro";
import { Text } from "@/components/cms/text";
import { hasText, hasCopy } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { STORAGE_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata(
    (await fetchContent(STORAGE_QUERY))?.seo,
    "/storage-heating",
  );
}
export default async function StoragePage() {
  const page = await fetchContent(STORAGE_QUERY);
  if (!page) return null;
  const g = page.guide;
  const sections = [
    [g?.shortTermTitle, g?.shortTermBody],
    [g?.freezerTitle, g?.freezerBody],
    [g?.ovenTitle, g?.ovenBody],
    [g?.servingTitle, g?.servingBody],
  ]
    .map(([title, body], index) => ({ title, body, index }))
    .filter((section) => hasText(section.title) || hasText(section.body));
  if (!hasCopy(page.intro) && !hasCopy(page.guide)) return null;
  return (
    <div className="shell pb-24">
      <PageIntro {...page.intro} />
      <Text className="draft-pill" value={g?.note} />
      {sections.length ? (
        <div className="storage-guide">
          {sections.map((section) => (
            <section key={section.index}>
              <span className="step-number">
                {String(section.index + 1).padStart(2, "0")}
              </span>
              <Text as="h2" value={section.title} />
              <Text value={section.body} />
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
