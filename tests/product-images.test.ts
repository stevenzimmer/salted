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

test("card and detail images match the initial available size and annotate its editorial array key", () => {
  for (const content of [
    createElement(ProductCard, { product }),
    detail(product),
  ]) {
    const html = render(content);
    assert.match(html, /alt="Square size photo"/);
    assert.match(html, /square-1200x1500.webp/);
    assert.match(html, /<input[^>]*checked=""[^>]*value="square"/);
    assert.match(html, /disabled=""[^>]*value="round"/);
    assert.match(html, /path=variants:editor-square.image/);
  }
  const html = render(detail(product));
  assert.match(html, /Square caption/);
  assert.doesNotMatch(html, /Main caption/);
});

test("missing or invalid size photos fall back to the CMS main image in both views", () => {
  for (const image of [
    undefined,
    { ...squareImage, asset: undefined },
    { ...squareImage, alt: " " },
    { ...squareImage, asset: { _ref: "invalid", _type: "reference" as const } },
  ]) {
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

test("size photos work without a main image; clearing both removes image boxes", () => {
  const withoutMain = { ...product, image: undefined };
  assert.match(
    render(detail(withoutMain), withoutMain),
    /alt="Square size photo"/,
  );
  assert.match(
    render(createElement(ProductCard, { product: withoutMain }), withoutMain),
    /class="product-image"/,
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

test("sold-out and variantless products keep optional-image behavior", () => {
  const soldOut = { ...schedule, availability: [] };
  const html = render(detail(product), product, soldOut);
  assert.match(html, /alt="Main product photo"/);
  assert.match(html, /<input[^>]*checked=""[^>]*value="round"/);
  const variantless = { ...product, variants: [] };
  const page = render(detail(variantless), variantless);
  assert.match(page, /alt="Main product photo"/);
  assert.doesNotMatch(page, /type="radio"/);
});

test("decorative size photos retain empty alt text and keyed Visual Editing paths survive reordering", () => {
  const variant = {
    ...product.variants[1],
    image: { ...squareImage, decorative: true, alt: undefined },
  };
  const reordered = { ...product, variants: [variant, product.variants[0]] };
  const html = render(detail(reordered), reordered);
  assert.match(html, /alt=""/);
  assert.match(html, /square-1200x1500.webp/);
  assert.match(html, /path=variants:editor-square.image/);
});
