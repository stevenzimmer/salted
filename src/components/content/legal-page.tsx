import type { StegaBranded } from "@sanity/client/stega";
import type { PrivacyPage, TermsPage } from "../../../sanity.types";
import { PageIntro } from "./page-intro";
import { RichText } from "@/components/cms/rich-text";
import { hasCopy, hasText, hasPortableTextContent } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
export function LegalPage({
  content,
}: {
  content:
    PrivacyPage | TermsPage | StegaBranded<PrivacyPage | TermsPage> | null;
}) {
  if (
    !content ||
    (!hasCopy(content.intro) &&
      !hasText(content.updatedText) &&
      !hasPortableTextContent(content.body))
  )
    return null;
  return (
    <div className="shell pb-24">
      <PageIntro {...content.intro} />
      <Text value={content.updatedText} />
      <RichText className="legal-content" value={content.body} />
    </div>
  );
}
