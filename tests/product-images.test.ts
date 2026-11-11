import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageConfigContext } from "next/dist/shared/lib/image-config-context.shared-runtime";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import nextConfig from "../next.config";
import { CartProvider } from "../src/components/commerce/cart-provider";
import { ProductCard } from "../src/components/commerce/product-card";
import { ProductDetailLayout } from "../src/components/commerce/product-images";
import { ProductPurchase } from "../src/components/commerce/product-purchase";
import { ProductSelectionProvider } from "../src/components/commerce/product-selection";
import { CmsImage } from "../src/components/cms/image";
import { getProductImage } from "../src/lib/product-image";
import type { ImageWithAlt } from "../sanity.types";
import type { MockSchedule, Product } from "../src/types/content";
import { products } from "./fixtures/catalog";

const mainImage: ImageWithAlt = {
  _type: "imageWithAlt",
  asset: { _type: "reference", _ref: "image-main-1200x1500-jpg" },
  alt: "Main product photo",
  caption: "Main caption",
};
const squareImage: ImageWithAlt = {
  ...mainImage,
  asset: { _type: "reference", _ref: "image-square-1200x1500-webp" },
  alt: "Square size photo",
  caption: "Square caption",
};
const product: Product = {
  ...products[0],
  image: mainImage,
  variants: products[0].variants.map((variant) => ({
    ...variant,
    // Editorial array keys need not match the stable inventory identity.
    _key: `editor-${variant.id}`,
    active: variant.id !== "round",
    image: variant.id === "square" ? squareImage : undefined,
  })),
};
const schedule: MockSchedule = {
  dates: [
    {
      id: "future",
      date: "2999-01-04",
      pickupStart: "09:00",
      pickupEnd: "12:00",
      orderCutoff: "2999-01-02T23:59:59-08:00",
      enabled: true,
    },
  ],
  availability: product.variants.map((variant) => ({
    pickupDateId: "future",
    productId: product.id,
    variantId: variant.id,
    inventory: variant.id === "round" ? 0 : 4,
  })),
};

function render(content: ReactNode, item = product, stock = schedule) {
  const cartProps = {
    products: [item],
    commerce: null,
    settings: null,
    schedule: stock,
    children: content,
  };
  return renderToStaticMarkup(
    createElement(
      ImageConfigContext.Provider,
      { value: { ...imageConfigDefault, ...nextConfig.images } },
      createElement(CartProvider, cartProps),
    ),
  );
}

function detail(item: Product) {
  const props = {
    product: item,
    children: createElement(
      ProductDetailLayout,
      null,
      createElement(ProductPurchase, { detailed: true }),
    ),
  };
  return createElement(ProductSelectionProvider, props);
}

test("cards and detail pages start with the product thumbnail and no size selected", () => {
  for (const content of [
    createElement(ProductCard, { product }),
    detail(product),
  ]) {
    const html = render(content);
    assert.match(html, /alt="Main product photo"/);
    assert.doesNotMatch(html, /square-1200x1500.webp|checked=""|is-selected/);
    assert.match(html, /disabled=""[^>]*value="round"/);
    assert.match(html, /path=image/);
  }
  const html = render(detail(product));
  assert.match(html, /Main caption/);
  assert.doesNotMatch(html, /Square caption/);
});

test("missing or invalid size photos fall back to the CMS main image in both views", () => {
  for (const image of [
    undefined,
    { ...squareImage, asset: undefined },
    { ...squareImage, alt: " " },
    { ...squareImage, asset: { _ref: "invalid", _type: "reference" as const } },
  ]) {
    const selectedImage = getProductImage(product, {
      ...product.variants[1],
      image,
    });
    assert.equal(selectedImage.image, mainImage);
    assert.equal(selectedImage.path, "image");
    const item = {
      ...product,
      variants: product.variants.map((variant) => ({ ...variant, image })),
    };
    for (const content of [
      createElement(ProductCard, { product: item }),
      detail(item),
    ]) {
      const html = render(content, item);
      assert.match(html, /alt="Main product photo"/);
      assert.doesNotMatch(html, /square-1200x1500.webp/);
    }
    assert.match(render(detail(item), item), /Main caption/);
  }
});

test("missing thumbnails leave no initial image box even when a size has a photo", () => {
  const withoutMain = { ...product, image: undefined };
  const initialDetail = render(detail(withoutMain), withoutMain);
  assert.doesNotMatch(initialDetail, /<img|product-detail-image/);
  const initialCard = render(
    createElement(ProductCard, { product: withoutMain }),
    withoutMain,
  );
  assert.doesNotMatch(initialCard, /<img|class="product-image"|product-scrim/);
  assert.equal(
    getProductImage(withoutMain, withoutMain.variants[1]).image,
    squareImage,
  );
  const cleared = {
    ...withoutMain,
    variants: withoutMain.variants.map((variant) => ({
      ...variant,
      image: undefined,
    })),
  };
  const card = render(
    createElement(ProductCard, { product: cleared }),
    cleared,
  );
  assert.doesNotMatch(card, /<img|class="product-image"|product-scrim/);
  assert.match(card, /cms-product-no-image/);
  const page = render(detail(cleared), cleared);
  assert.doesNotMatch(page, /<img|product-detail-image/);
  assert.match(page, /cms-single-column/);
});

test("closed pickup dates keep the thumbnail and unselected sizes; variantless products keep optional images", () => {
  const soldOut = { ...schedule, availability: [] };
  const html = render(detail(product), product, soldOut);
  assert.match(html, /alt="Main product photo"/);
  assert.doesNotMatch(html, /checked=""|is-selected/);
  const variantless = { ...product, variants: [] };
  const page = render(detail(variantless), variantless);
  assert.match(page, /alt="Main product photo"/);
  assert.doesNotMatch(page, /type="radio"/);
});

test("selected size photos retain their alt text and exact keyed Visual Editing path", () => {
  const selected = getProductImage(product, product.variants[1]);
  assert.equal(selected.image, squareImage);
  const html = render(
    createElement(CmsImage, {
      ...selected,
      documentId: product._id,
      documentType: product._type,
    }),
  );
  assert.match(html, /alt="Square size photo"/);
  assert.match(html, /square-1200x1500.webp/);
  assert.match(html, /path=variants:editor-square.image/);
});

test("decorative size photos retain empty alt text and keyed Visual Editing paths survive reordering", () => {
  const variant = {
    ...product.variants[1],
    image: { ...squareImage, decorative: true, alt: undefined },
  };
  const reordered = { ...product, variants: [variant, product.variants[0]] };
  const html = render(
    createElement(CmsImage, {
      ...getProductImage(reordered, variant),
      documentId: reordered._id,
      documentType: reordered._type,
    }),
    reordered,
  );
  assert.match(html, /alt=""/);
  assert.match(html, /square-1200x1500.webp/);
  assert.match(html, /path=variants:editor-square.image/);
});
