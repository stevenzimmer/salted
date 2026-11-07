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

test("active products with no inventory keep the existing sold-out controls", () => {
  const html = renderPurchase(products[0], { ...schedule, availability: [] });
  assert.match(html, /Sold out/);
  assert.match(html, /type="radio"/);
  assert.doesNotMatch(html, /Add to bag/);
  assert.match(html, /disabled="" class="add-button"/);
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
