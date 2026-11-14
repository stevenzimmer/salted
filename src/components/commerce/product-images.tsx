"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/content";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { clean } from "@/sanity/lib/content";
import { getProductImage } from "@/lib/product-image";
import { useProductSelection } from "./product-selection";

function ProductImage({
  selection,
  product,
  preload,
  sizes,
}: {
  selection: ReturnType<typeof getProductImage>;
  product: Product;
  preload: boolean;
  sizes: string;
}) {
  const { image, path, fallback } = selection;
  if (fallback) {
    return (
      <Image
        src={fallback.src}
        alt={fallback.alt}
        fill
        style={{ objectFit: "contain" }}
        preload={preload}
        sizes={sizes}
      />
    );
  }
  return (
    <CmsImage
      image={image}
      aspectRatio={4 / 5}
      documentType={product._type}
      documentId={product._id}
      path={path}
      preload={preload}
      sizes={sizes}
    />
  );
}

export function ProductCardImage({
  children,
  preload = false,
  sizes,
}: {
  children?: ReactNode;
  preload?: boolean;
  sizes: string;
}) {
  const { product, variant } = useProductSelection();
  const selection = getProductImage(product, variant);
  const hasImage = Boolean(selection.image || selection.fallback);
  if (!hasImage && !children) return null;

  return (
    <div className={hasImage ? "product-image" : "cms-product-no-image"}>
      {hasImage ? (
        <>
          <ProductImage
            selection={selection}
            product={product}
            preload={preload}
            sizes={sizes}
          />
          <Link
            href={`/products/${product.slug}`}
            className="product-image-link absolute inset-0 z-10"
            aria-label={`View ${clean(product.name) || "product"}`}
          />
        </>
      ) : null}
      <Text as="span" className="product-badge" value={product.badge} />
      {children ? (
        <div className="product-overlay absolute inset-x-0 bottom-0 z-20">
          {hasImage ? (
            <span className="product-scrim" aria-hidden="true" />
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ProductDetailLayout({ children }: { children?: ReactNode }) {
  const { product, variant } = useProductSelection();
  const selection = getProductImage(product, variant);
  const hasImage = Boolean(selection.image || selection.fallback);
  if (!hasImage && !children) return null;

  return (
    <article
      className={`product-detail-grid ${!hasImage || !children ? "cms-single-column" : ""}`}
    >
      {hasImage ? (
        <div className="product-detail-image">
          <ProductImage
            selection={selection}
            product={product}
            preload
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <Text
            as="span"
            className="photo-label"
            value={selection.image?.caption}
          />
        </div>
      ) : null}
      {children}
    </article>
  );
}
