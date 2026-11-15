import type { StorageHeatingPage } from "../../../sanity.types";
import { RichText } from "@/components/cms/rich-text";
import { Text } from "@/components/cms/text";
import { hasText, hasPortableTextContent } from "@/sanity/lib/content";
import { plainTextToPortableText } from "@/sanity/lib/plain-text-to-portable-text";

export function StorageGuide({
  guide,
}: {
  guide?: StorageHeatingPage["guide"];
}) {
  const sections = [
    { title: guide?.shortTermTitle, body: guide?.shortTermBody },
    { title: guide?.freezerTitle, body: guide?.freezerBody },
    { title: guide?.ovenTitle, body: guide?.ovenBody },
    { title: guide?.servingTitle, body: guide?.servingBody },
  ]
    .map(({ title, body }, index) => ({
      title,
      // Existing CMS strings remain visible until the content migration runs.
      body: typeof body === "string" ? plainTextToPortableText(body) : body,
      index,
    }))
    .filter(
      ({ title, body }) => hasText(title) || hasPortableTextContent(body),
    );
  if (!sections.length) return null;

  return (
    <div className="storage-guide">
      {sections.map(({ title, body, index }) => (
        <section key={index}>
          <span className="step-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Text as="h2" value={title} />
          <RichText className="storage-guide-body" value={body} />
        </section>
      ))}
    </div>
  );
}
