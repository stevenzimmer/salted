import { homeShareCard } from "@/lib/og/cards";
import { renderShareCard } from "@/lib/og/render";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { HOME_QUERY } from "@/sanity/lib/queries";

export const fetchCache = "force-no-store";

export async function GET() {
  const data = await fetchContent(HOME_QUERY, {}, { publishedOnly: true });
  return renderShareCard(homeShareCard(data?.page ?? {}));
}
