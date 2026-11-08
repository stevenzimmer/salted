import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product, MockSchedule } from "../src/types/content";
import type { CommerceCopy } from "../sanity.types";
import { CartProvider } from "../src/components/commerce/cart-provider";
import { ProductSelectionProvider } from "../src/components/commerce/product-selection";
import { ProductPurchase } from "../src/components/commerce/product-purchase";
import { ProductUnavailable } from "../src/components/commerce/product-unavailable";
import { ProductCard } from "../src/components/commerce/product-card";
import { mapProduct } from "../src/sanity/lib/mappers";
import { getMockSchedule } from "../src/data/product-availability";
import { normalizeCart, resolveCart } from "../src/lib/cart";
import {
  inactiveProductCopy,
  migrateInactiveProductCopy,
} from "../scripts/migrations/inactive-products";
import { products } from "./fixtures/catalog";

const schedule = getMockSchedule(new Date("2999-01-01T19:00:00Z"));

function renderPurchase(product: Product, stock: MockSchedule = schedule) {
  const selectionProps = {
    product,
    children: createElement(ProductPurchase, { detailed: true }),
  };
  const cartProps = {
    products: [product],
    schedule: stock,
    commerce: {
      _id: "commerceCopy",
      _type: "commerceCopy",
      _rev: "",
      _createdAt: "",
      _updatedAt: "",
      internalName: "Test commerce copy",
      product: {
        chooseSize: "Choose your size",
        add: "Add to bag",
        soldOut: "Sold out",
      },
    } satisfies CommerceCopy,
    settings: null,
    children: createElement(ProductSelectionProvider, selectionProps),
  };
  return renderToStaticMarkup(createElement(CartProvider, cartProps));
}

test("inactive products have no purchase controls even when inventory exists", () => {
  assert.equal(renderPurchase({ ...products[0], active: false }), "");
  assert.match(renderPurchase(products[0]), /Add to bag/);
  assert.match(renderPurchase(products[0]), /type="radio"/);
});

test("active products can be added without inventory or open pickup dates", () => {
  const html = renderPurchase(products[0], { dates: [], availability: [] });
  assert.doesNotMatch(html, /Sold out/);
  assert.match(html, /type="radio"/);
  assert.match(html, /Add to bag/);
  assert.doesNotMatch(html, /disabled="" class="add-button"/);
  const radios = html.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
  assert.equal(radios.length, products[0].variants.length);
  assert.ok(radios.every((radio) => !radio.includes("disabled")));
});

test("all CMS-inactive sizes keep add-to-bag and quantity controls disabled", () => {
  const item = {
    ...products[0],
    variants: products[0].variants.map((variant) => ({
      ...variant,
      active: false,
    })),
  };
  const html = renderPurchase(item, schedule);
  assert.match(html, /disabled="" class="add-button"/);
  assert.doesNotMatch(html, /Add to bag/);
  assert.match(
    html,
    /aria-label="Increase quantity for pesto mozzarella" disabled=""/,
  );
});

test("active and legacy sizes stay selectable with no pickup dates and default to CMS order", () => {
  const html = renderPurchase(products[0], { dates: [], availability: [] });
  const radios = html.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
  assert.ok(radios.every((radio) => !radio.includes("disabled")));
  const firstRadio = radios[0];
  assert.ok(firstRadio);
  assert.match(firstRadio, /checked=""/);
  assert.match(firstRadio, /value="round"/);
});
test("only CMS-inactive sizes are disabled, and the first active size is selected even without pickup availability", () => {
  const item = {
    ...products[0],
    variants: products[0].variants.map((variant, i) => ({
      ...variant,
      active: i !== 0,
    })),
  };
  const html = renderPurchase(item, { dates: [], availability: [] });
  const radios = html.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
  assert.equal(radios.length, 3);
  assert.match(radios[0], /disabled=""/);
  assert.doesNotMatch(radios[1], /disabled/);
  assert.match(radios[1], /checked=""/);
  assert.doesNotMatch(radios[2], /disabled/);
  const cart = [{ productId: item.id, variantId: "round", quantity: 1 }];
  assert.deepEqual(normalizeCart(cart, [item]), []);
  assert.deepEqual(resolveCart(cart, [item]), []);
});
test("CMS mapping retains inactive sizes for disabled controls, without advertising their price", () => {
  const original = products[0];
  const mapped = mapProduct({
    ...original,
    displayName: original.name,
    slug: { _type: "slug", current: original.slug },
    category: { _type: "reference", _ref: "product-category-focaccia" },
    variants: original.variants.map((variant, i) => ({
      ...variant,
      _type: "productVariant" as const,
      active: i !== 0,
    })),
  });
  assert.ok(mapped);
  assert.equal(mapped.variants.length, original.variants.length);
  assert.equal(mapped.variants[0].active, false);
  const cartProps = {
    products: [mapped],
    commerce: null,
    settings: null,
    schedule: { dates: [], availability: [] },
    children: createElement(ProductCard, { product: mapped }),
  };
  const html = renderToStaticMarkup(createElement(CartProvider, cartProps));
  assert.match(html, /class="product-price">\$15/);
  assert.doesNotMatch(html, /class="product-price">\$8/);
});

function renderUnavailable(copy?: CommerceCopy["inactiveProduct"]) {
  return renderToStaticMarkup(createElement(ProductUnavailable, { copy }));
}

test("inactive message renders CMS copy and the fixed special-orders CTA", () => {
  const html = renderUnavailable(inactiveProductCopy);
  assert.match(html, /<h2[^>]*>Taking a little dough break\./);
  assert.match(html, /Check back later for future availability/);
  assert.match(html, /href="\/special-orders"/);
  assert.doesNotMatch(html, /<button|<input|<fieldset/);
});

test("cleared inactive copy collapses without fallback text or empty wrappers", () => {
  for (const copy of [undefined, {}, { heading: " ", body: "", cta: " " }])
    assert.equal(renderUnavailable(copy), "");
  const html = renderUnavailable({ body: "Check back soon." });
  assert.match(html, /Check back soon\./);
  assert.doesNotMatch(html, /<h2|<a /);
});

test("inactive catalog entries cannot survive persisted cart resolution", () => {
  const inactiveCatalog = [{ ...products[0], active: false }];
  const items = [
    { productId: products[0].id, variantId: "round", quantity: 1 },
  ];
  assert.deepEqual(normalizeCart(items, inactiveCatalog), []);
  assert.deepEqual(resolveCart(items, inactiveCatalog), []);
});

test("copy migration adds only the absent slot and preserves edited or cleared groups", () => {
  const updates = migrateInactiveProductCopy({ product: { add: "Keep this" } });
  assert.deepEqual(updates, { inactiveProduct: inactiveProductCopy });
  assert.equal(migrateInactiveProductCopy({ ...updates }), null);
  for (const inactiveProduct of [
    null,
    {},
    { heading: "Edited", body: "", cta: " " },
  ])
    assert.equal(migrateInactiveProductCopy({ inactiveProduct }), null);
});
