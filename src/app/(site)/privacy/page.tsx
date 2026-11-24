import { LegalPage } from "@/components/content/legal-page";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { PRIVACY_QUERY } from "@/sanity/lib/queries";
import { pageMetadata } from "@/lib/seo/metadata";
export async function generateMetadata() {
  const page = await fetchContent(PRIVACY_QUERY, {}, { publishedOnly: true });
  return pageMetadata({
    path: "/privacy",
    eligible: false,
    title: "Privacy Policy",
    seo: page?.seo,
    description: page?.intro?.description,
  });
}
export default async function Page() {
  return <LegalPage content={await fetchContent(PRIVACY_QUERY)} />;
}
