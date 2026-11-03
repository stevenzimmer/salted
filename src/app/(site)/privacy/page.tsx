import { LegalPage } from "@/components/content/legal-page";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { PRIVACY_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata((await fetchContent(PRIVACY_QUERY))?.seo, "/privacy");
}
export default async function Page() {
  return <LegalPage content={await fetchContent(PRIVACY_QUERY)} />;
}
