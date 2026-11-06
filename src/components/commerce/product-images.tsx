"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { clean } from "@/sanity/lib/content";
import { getProductImage } from "@/lib/product-image";
import { useProductSelection } from "./product-selection";

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
  const { image, path } = getProductImage(product, variant);
  if (!image && !children) return null;

  return (
    <div className={image ? "product-image" : "cms-product-no-image"}>
      {image ? (
        <>
          <CmsImage
            image={image}
            aspectRatio={4 / 5}
            documentType={product._type}
            documentId={product._id}
            path={path}
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
          {image ? <span className="product-scrim" aria-hidden="true" /> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ProductDetailLayout({ children }: { children?: ReactNode }) {
  const { product, variant } = useProductSelection();
  const { image, path } = getProductImage(product, variant);
  if (!image && !children) return null;

  return (
    <article
      className={`product-detail-grid ${!image || !children ? "cms-single-column" : ""}`}
    >
      {image ? (
        <div className="product-detail-image">
          <CmsImage
            image={image}
            aspectRatio={4 / 5}
            documentType={product._type}
            documentId={product._id}
            path={path}
            preload
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <Text as="span" className="photo-label" value={image.caption} />
        </div>
      ) : null}
      {children}
    </article>
  );
}
