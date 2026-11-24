import { PageIntro } from "@/components/content/page-intro";
import { StorageGuide } from "@/components/content/storage-guide";
import { Text } from "@/components/cms/text";
import { hasCopy, hasPortableTextContent } from "@/sanity/lib/content";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { STORAGE_QUERY } from "@/sanity/lib/queries";
import { fixedPageMetadata } from "@/lib/seo/metadata";
import { FixedPageStructuredData } from "@/components/cms/search-structured-data";
export function generateMetadata() {
  return fixedPageMetadata("/storage-heating");
}
export default async function StoragePage() {
  const page = await fetchContent(STORAGE_QUERY);
  if (!page) return null;
  const g = page.guide;
  if (
    !hasCopy(page.intro) &&
    !hasCopy(g) &&
    !Object.values(g ?? {}).some(
      (value) => Array.isArray(value) && hasPortableTextContent(value),
    )
  )
    return null;
  return (
    <div className="shell pb-24">
      <FixedPageStructuredData path="/storage-heating" />
      <PageIntro {...page.intro} />
      <Text className="draft-pill" value={g?.note} />
      <StorageGuide guide={g} />
    </div>
  );
}
