import { productShareCard } from "@/lib/og/cards";
import { renderShareCard } from "@/lib/og/render";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { mapProduct } from "@/sanity/lib/mappers";
import { GLOBAL_QUERY, PRODUCT_QUERY } from "@/sanity/lib/queries";

export const fetchCache = "force-no-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const published = { publishedOnly: true };
  const [data, globals] = await Promise.all([
    fetchContent(PRODUCT_QUERY, { slug }, published),
    fetchContent(GLOBAL_QUERY, {}, published),
  ]);
  const product = data && mapProduct(data);
  if (!product) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return renderShareCard(
    productShareCard(product, globals?.commerce?.product?.from),
  );
}
