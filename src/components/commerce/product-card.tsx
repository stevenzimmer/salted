import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/content";
import type { CommerceCopy } from "../../../sanity.types";
import { money } from "@/lib/format";
import { hasImage, hasText } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { ProductPurchase } from "./product-purchase";
import { ProductCardImage } from "./product-images";
import { ProductSelectionProvider } from "./product-selection";
type ProductCardProps = {
  product: Product;
  copy?: CommerceCopy["product"];
  variant?: "default" | "preview" | "storefront";
  preload?: boolean;
};
export function ProductCard({
  product,
  copy,
  variant = "default",
  preload = false,
}: ProductCardProps) {
  const Heading = variant === "preview" ? "h2" : "h3";
  const showDetailsLink = variant !== "storefront";
  const activePrices = product.variants
    .filter((option) => option.active !== false)
    .map((option) => option.price);
  const price =
    product.active && activePrices.length
      ? Math.min(...activePrices)
      : undefined;
  const showFrom =
    activePrices.some((amount) => amount !== price) && hasText(copy?.from);
  const copyVisible =
    [
      product.name,
      product.shortDescription,
      showDetailsLink ? copy?.details : undefined,
    ].some(hasText) || price !== undefined;
  if (
    !hasImage(product.image) &&
    !hasText(product.badge) &&
    !copyVisible &&
    !product.variants.length
  )
    return null;
  return (
    <ProductSelectionProvider product={product}>
      <article className="product-card h-full relative" data-variant={variant}>
        <ProductCardImage
          preload={preload}
          sizes={
            variant === "preview"
              ? "(max-width: 767px) 100vw, 45vw"
              : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
          }
        />
        {copyVisible ? (
          <div className="product-copy xl:min-h-18">
            {hasText(product.name) || price !== undefined ? (
              <div className="product-heading">
                {hasText(product.name) ? (
                  <Heading>
                    <Link href={`/products/${product.slug}`}>
                      {product.name}
                    </Link>
                  </Heading>
                ) : null}
                {price !== undefined ? (
                  <p className="product-price">
                    {showFrom ? <>{copy?.from} </> : null}
                    {money(price)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {hasText(product.shortDescription) ||
            (showDetailsLink && hasText(copy?.details)) ? (
              <div className="product-reveal">
                <div>
                  <Text
                    className="product-description"
                    value={product.shortDescription}
                  />
                  {showDetailsLink && hasText(copy?.details) ? (
                    <Link
                      className="product-details-link"
                      href={`/products/${product.slug}`}
                    >
                      {copy.details}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {variant !== "preview" ? <ProductPurchase /> : null}
      </article>
    </ProductSelectionProvider>
  );
}
