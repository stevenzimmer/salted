import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/content";
import { money } from "@/lib/format";
import { ProductPurchase } from "./product-purchase";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "preview";
  preload?: boolean;
  showDetailsLink?: boolean;
};

export function ProductCard({
  product,
  variant = "default",
  preload = false,
  showDetailsLink = true,
}: ProductCardProps) {
  const Heading = variant === "preview" ? "h2" : "h3";

  return (
    <article className="product-card" data-variant={variant}>
      <div className="product-image">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          unoptimized
          preload={preload}
          sizes={
            variant === "preview"
              ? "(max-width: 767px) 100vw, 45vw"
              : "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
          }
        />
        {product.badge ? (
          <span className="product-badge">{product.badge}</span>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className="product-image-link absolute inset-0 z-10"
          aria-label={`View ${product.name}`}
        />
        <div className="product-overlay absolute inset-x-0 bottom-0 z-20">
          <div className="product-heading">
            <Heading>
              <Link href={`/products/${product.slug}`}>{product.name}</Link>
            </Heading>
            <span className="product-price">
              {product.variants.length > 1 ? "from " : ""}
              {money(product.variants[0].price)}
            </span>
          </div>
          <div className="product-reveal">
            <div>
              <p className="product-description">{product.shortDescription}</p>
              {showDetailsLink ? (
                <Link
                  className="product-details-link"
                  href={`/products/${product.slug}`}
                >
                  The delicious details{" "}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {variant === "default" ? <ProductPurchase product={product} /> : null}
    </article>
  );
}
