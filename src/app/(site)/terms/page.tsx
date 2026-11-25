import { LegalPage } from "@/components/content/legal-page";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { TERMS_QUERY } from "@/sanity/lib/queries";
import { pageMetadata } from "@/lib/seo/metadata";
export async function generateMetadata() {
  const page = await fetchContent(TERMS_QUERY, {}, { publishedOnly: true });
  return pageMetadata({
    path: "/terms",
    eligible: false,
    title: "Terms and Conditions",
    seo: page?.seo,
    description: page?.intro?.description,
  });
}
export default async function Page() {
  return <LegalPage content={await fetchContent(TERMS_QUERY)} />;
}
