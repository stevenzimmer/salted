import { LegalPage } from "@/components/content/legal-page";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { TERMS_QUERY } from "@/sanity/lib/queries";
import { contentMetadata } from "@/sanity/lib/metadata";
export async function generateMetadata() {
  return contentMetadata((await fetchContent(TERMS_QUERY))?.seo, "/terms");
}
export default async function Page() {
  return <LegalPage content={await fetchContent(TERMS_QUERY)} />;
}
