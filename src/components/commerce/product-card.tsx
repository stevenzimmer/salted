import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/content";
import { money } from "@/lib/format";
import { ProductPurchase } from "./product-purchase";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link
        href={`/products/${product.slug}`}
        className="product-image"
        aria-label={`View ${product.name}`}
      >
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          unoptimized
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
        />
        {product.badge ? (
          <span className="product-badge">{product.badge}</span>
        ) : null}
        <span className="image-arrow" aria-hidden="true">
          <ArrowUpRight size={20} />
        </span>
        <span className="photo-label">Photography coming soon</span>
      </Link>
      <div className="product-heading">
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <span className="product-price">
          {product.variants.length > 1 ? "from " : ""}
          {money(product.variants[0].price)}
        </span>
      </div>
      <p className="product-description">{product.shortDescription}</p>
      <ProductPurchase product={product} />
      <Link className="product-details-link" href={`/products/${product.slug}`}>
        The delicious details <ArrowUpRight size={13} />
      </Link>
    </article>
  );
}
