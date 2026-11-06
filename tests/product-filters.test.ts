import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommerceCopy } from "../sanity.types";
import { ProductStorefront } from "../src/components/home/product-storefront";
import {
  categoryDocument,
  migrateProductCategory,
  migrateProductFilters,
} from "../scripts/migrations/product-filters";

function render(filters?: NonNullable<CommerceCopy["product"]>["filters"]) {
  return renderToStaticMarkup(
    createElement(ProductStorefront, {
      copy: { filters },
      items: [
        { id: "f", category: "focaccia", content: "Focaccia product" },
        { id: "s", category: "sourdough", content: "Sourdough product" },
      ],
    }),
  );
}
test("CMS order determines filter order and initial selection", () => {
  const html = render([
    {
      _key: "s",
      _type: "productFilter",
      category: { _type: "reference", _ref: "sourdough" },
      label: "Loaves",
    },
    {
      _key: "f",
      _type: "productFilter",
      category: { _type: "reference", _ref: "focaccia" },
      label: "Squares",
    },
  ]);
  assert.ok(html.indexOf("Loaves") < html.indexOf("Squares"));
  assert.ok(html.includes("Sourdough product"));
  assert.ok(!html.includes("Focaccia product"));
  assert.match(html, /aria-pressed="true"[^>]*>Loaves/);
});
test("empty, missing and cleared filters show all products without a toolbar", () => {
  for (const filters of [
    undefined,
    [],
    [
      {
        _key: "blank",
        _type: "productFilter" as const,
        category: { _type: "reference" as const, _ref: "focaccia" },
        label: " ",
      },
    ],
  ]) {
    const html = render(filters);
    assert.ok(html.includes("Focaccia product"));
    assert.ok(html.includes("Sourdough product"));
    assert.ok(!html.includes("storefront-toolbar"));
  }
});
test("all-products entry shows both categories", () => {
  const html = render([
    { _key: "a", _type: "productFilter", showAll: true, label: "Everything" },
  ]);
  assert.ok(html.includes("Focaccia product"));
  assert.ok(html.includes("Sourdough product"));
});
test("migration preserves each version's labels and removes only obsolete fields", () => {
  for (const label of ["Published label", "Draft label", ""]) {
    const result = migrateProductFilters({
      product: { focacciaFilter: label, menuNote: "Keep" },
    });
    assert.deepEqual(result?.set["product.filters"], [
      {
        _key: "focaccia",
        _type: "productFilter",
        category: { _type: "reference", _ref: "product-category-focaccia" },
        showAll: false,
        label,
      },
    ]);
    assert.deepEqual(result?.unset, ["product.focacciaFilter"]);
  }
});
test("migration preserves edited or empty lists and is idempotent", () => {
  for (const filters of [
    [],
    [{ _key: "custom", label: "Custom", showAll: true }],
  ]) {
    assert.deepEqual(
      migrateProductFilters({ product: { filters, allFilter: "Old" } })?.set,
      {},
    );
    assert.equal(migrateProductFilters({ product: { filters } }), null);
  }
  assert.equal(migrateProductFilters({}), null);
  assert.throws(() =>
    migrateProductFilters({
      product: { filters: "invalid", allFilter: "Old" },
    }),
  );
});

test("filters match arbitrary category document identities, including a category named all", () => {
  const html = renderToStaticMarkup(
    createElement(ProductStorefront, {
      copy: {
        filters: [
          {
            _key: "new",
            _type: "productFilter",
            label: "Pastries",
            category: { _type: "reference", _ref: "all" },
          },
        ],
      },
      items: [
        { id: "new-product", category: "all", content: "New category product" },
        {
          id: "other",
          category: "other-category",
          content: "Other category product",
        },
      ],
    }),
  );
  assert.ok(html.includes("New category product"));
  assert.ok(!html.includes("Other category product"));
});
test("an incomplete category filter is omitted instead of hiding every product", () => {
  const html = render([
    { _key: "missing", _type: "productFilter", label: "Missing target" },
  ]);
  assert.ok(html.includes("Focaccia product"));
  assert.ok(html.includes("Sourdough product"));
  assert.ok(!html.includes("Missing target"));
});
test("category migration accepts new names, preserves product identities and leaves references alone", () => {
  const product = {
    id: "existing-inventory-key",
    category: "Sweet pastries / seasonal",
  };
  const result = migrateProductCategory(product);
  assert.equal(result?.categories[0].title, "Sweet pastries / seasonal");
  assert.equal(
    result?.set.category._ref,
    categoryDocument(product.category)._id,
  );
  assert.deepEqual(Object.keys(result?.set ?? {}), ["category"]);
  assert.equal(
    migrateProductCategory({ category: result?.set.category }),
    null,
  );
  assert.throws(() => migrateProductCategory({ category: " " }));
});
test("migration upgrades the previous filter array without changing labels, order, or keys", () => {
  const old = [
    {
      _key: "custom",
      _type: "productFilter",
      label: "All bakes",
      category: "all",
    },
    {
      _key: "new",
      _type: "productFilter",
      label: "Sweet",
      category: "Pastries",
    },
  ];
  const result = migrateProductFilters({
    product: { filters: old, allFilter: "Obsolete" },
  });
  assert.deepEqual(result?.set["product.filters"], [
    {
      _key: "custom",
      _type: "productFilter",
      label: "All bakes",
      showAll: true,
    },
    {
      _key: "new",
      _type: "productFilter",
      label: "Sweet",
      showAll: false,
      category: { _type: "reference", _ref: categoryDocument("Pastries")._id },
    },
  ]);
  assert.deepEqual(result?.unset, ["product.allFilter"]);
  assert.equal(
    migrateProductFilters({
      product: { filters: result?.set["product.filters"] },
    }),
    null,
  );
});
