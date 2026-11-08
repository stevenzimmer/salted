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
  variant?: "default" | "preview";
  preload?: boolean;
  showDetailsLink?: boolean;
};
export function ProductCard({
  product,
  copy,
  variant = "default",
  preload = false,
  showDetailsLink = true,
}: ProductCardProps) {
  const Heading = variant === "preview" ? "h2" : "h3";
  const activeVariants = product.variants.filter(
    (option) => option.active !== false,
  );
  const price = activeVariants[0]?.price;
  const copyVisible =
    [
      product.name,
      product.badge,
      product.shortDescription,
      showDetailsLink ? copy?.details : undefined,
    ].some(hasText) || price !== undefined;
  if (!hasImage(product.image) && !copyVisible && !product.variants.length)
    return null;
  return (
    <ProductSelectionProvider product={product}>
      <article className="product-card" data-variant={variant}>
        <ProductCardImage
          preload={preload}
          sizes={
            variant === "preview"
              ? "(max-width: 767px) 100vw, 45vw"
              : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
          }
        >
          {copyVisible ? (
            <>
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
                    <span className="product-price">
                      {activeVariants.length > 1 && hasText(copy?.from) ? (
                        <>{copy.from} </>
                      ) : null}
                      {money(price)}
                    </span>
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
            </>
          ) : null}
        </ProductCardImage>
        {variant === "default" ? <ProductPurchase /> : null}
      </article>
    </ProductSelectionProvider>
  );
}
