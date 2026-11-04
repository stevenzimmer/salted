import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/content";
import type { CommerceCopy } from "../../../sanity.types";
import { money } from "@/lib/format";
import { hasImage, hasText, clean } from "@/sanity/lib/content";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { ProductPurchase } from "./product-purchase";
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
  const image = hasImage(product.image),
    price = product.variants[0]?.price;
  const copyVisible =
    [
      product.name,
      product.badge,
      product.shortDescription,
      showDetailsLink ? copy?.details : undefined,
    ].some(hasText) || price !== undefined;
  if (!image && !copyVisible && !product.variants.length) return null;
  return (
    <article className="product-card" data-variant={variant}>
      {image || copyVisible ? (
        <div className={image ? "product-image" : "cms-product-no-image"}>
          {image ? (
            <>
              <CmsImage
                image={product.image}
                aspectRatio={4 / 5}
                documentType={product._type}
                documentId={product._id}
                path="image"
                preload={preload}
                sizes={
                  variant === "preview"
                    ? "(max-width: 767px) 100vw, 45vw"
                    : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                }
              />
              <Link
                href={`/products/${product.slug}`}
                className="product-image-link absolute inset-0 z-10"
                aria-label={`View ${clean(product.name) || "product"}`}
              />
            </>
          ) : null}
          <Text as="span" className="product-badge" value={product.badge} />
          {copyVisible ? (
            <div className="product-overlay absolute inset-x-0 bottom-0 z-20">
              {image ? (
                <span className="product-scrim" aria-hidden="true" />
              ) : null}
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
                      {product.variants.length > 1 && hasText(copy?.from) ? (
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
            </div>
          ) : null}
        </div>
      ) : null}
      {variant === "default" ? <ProductPurchase product={product} /> : null}
    </article>
  );
}
