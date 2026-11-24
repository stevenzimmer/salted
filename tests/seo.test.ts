import assert from "node:assert/strict";
import test from "node:test";
import { stegaEncodeSourceMap } from "@sanity/client/stega";
import type { ImageWithAlt } from "../sanity.types";
import type { Recipe } from "../src/types/content";
import { buildPickupSchedule } from "../src/commerce/schedule-model";
import {
  searchableProduct,
  searchableRecipe,
} from "../src/lib/seo/eligibility";
import { approvedPhoto, searchText } from "../src/lib/seo/fields";
import { canonicalUrl, detailPath, siteHost } from "../src/lib/seo/policy";
import {
  businessEntities,
  pageEntities,
  productEntity,
  recipeEntity,
  serializeStructuredData,
} from "../src/lib/seo/structured-data";
import { products } from "./fixtures/catalog";

const photo: ImageWithAlt = {
  _type: "imageWithAlt",
  alt: "Tomatoes on toasted focaccia",
  asset: { _type: "reference", _ref: "image-example-1200x800-jpg" },
};

test("canonical details use the sole production origin and clean path segments", () => {
  assert.equal(
    canonicalUrl(detailPath("recipes", "tomato-toast")),
    `https://${siteHost}/recipes/tomato-toast`,
  );
  assert.equal(
    canonicalUrl(detailPath("products", "rosemary & pepper")),
    `https://${siteHost}/products/rosemary%20%26%20pepper`,
  );
});

test("eligibility honors availability, editorial noindex and usable public identities", () => {
  const product = {
    id: "focaccia",
    slug: { current: "focaccia" },
    displayName: "Focaccia",
    category: { _ref: "category" },
    tier: "classic",
  };
  assert.equal(searchableProduct({ ...product, active: true }), true);
  assert.equal(searchableProduct({ ...product, active: false }), false);
  assert.equal(
    searchableProduct({
      ...product,
      active: false,
      keepUnavailableIndexed: true,
    }),
    true,
  );
  assert.equal(
    searchableProduct({ ...product, active: true, seo: { noIndex: true } }),
    false,
  );
  assert.equal(
    searchableProduct({ ...product, active: true, displayName: " " }),
    false,
  );
  assert.equal(
    searchableRecipe({
      active: true,
      slug: { current: "a/b" },
      displayTitle: "Bread",
    }),
    false,
  );
  assert.equal(
    searchableRecipe({
      active: true,
      slug: { current: "bread" },
      displayTitle: "Bread",
    }),
    true,
  );
  assert.equal(
    searchableRecipe({
      active: false,
      slug: { current: "bread" },
      displayTitle: "Bread",
    }),
    false,
  );
});

test("search serialization removes source mapping and prevents script breakout", () => {
  const raw = '</script><script>alert("x")</script>';
  const { value } = stegaEncodeSourceMap(
    { value: raw },
    {
      documents: [{ _id: "recipe-test", _type: "recipe" }],
      paths: ["$['displayTitle']"],
      mappings: {
        "$['value']": {
          type: "value",
          source: { type: "documentValue", document: 0, path: 0 },
        },
      },
    },
    { enabled: true, studioUrl: "/studio", filter: () => true },
  );
  assert.notEqual(value, raw);
  assert.equal(searchText(value), raw);
  const json = serializeStructuredData(
    pageEntities("/recipes/test", searchText(value) ?? ""),
  );
  assert.equal(json.includes("<"), false);
  assert.equal(JSON.parse(json)["@graph"][0].name, raw);
});

test("product variants use canonical deep links and only fresh pickup prices", () => {
  const product = { ...products[0], active: true };
  const [first, second] = product.variants;
  const catalog = [
    {
      _id: product._id,
      id: product.id,
      displayName: product.name,
      active: true,
      variants: [
        { ...first, active: true },
        { ...second, active: true, price: second.price + 1 },
      ],
    },
  ];
  const path = detailPath("products", product.slug);
  const entity = productEntity(
    path,
    product,
    "Focaccia",
    buildPickupSchedule(catalog, []),
    catalog,
  );
  assert.equal(entity?.["@type"], "ProductGroup");
  if (entity?.["@type"] !== "ProductGroup")
    assert.fail("Expected product variants");
  assert.equal(entity.url, canonicalUrl(path));
  assert.equal(
    entity.hasVariant[0].offers?.availability,
    "https://schema.org/InStock",
  );
  assert.equal(
    entity.hasVariant[0].offers?.price,
    (first.price / 100).toFixed(2),
  );
  assert.equal(entity.hasVariant[0].offers?.priceCurrency, "USD");
  assert.equal(
    entity.hasVariant[0].url,
    `${canonicalUrl(path)}?size=${first.id}`,
  );
  assert.equal(entity.hasVariant[1].offers, undefined);
  const closed = productEntity(path, product, "Focaccia", undefined, catalog);
  if (closed?.["@type"] !== "ProductGroup")
    assert.fail("Expected product variants");
  assert.ok(closed.hasVariant.every((variant) => variant.offers === undefined));
  const inactive = productEntity(
    path,
    { ...product, active: false },
    undefined,
    undefined,
    undefined,
  );
  assert.equal(inactive?.["@type"], "Product");
  assert.equal(inactive?.offers, undefined);
});

test("reviewed complete recipes use actual ingredients, steps and ISO durations", () => {
  const recipe: Recipe = {
    _id: "recipe-test",
    _type: "recipe",
    _rev: "r1",
    internalName: "SEO fixture",
    _updatedAt: "2026-10-20T00:00:00Z",
    _createdAt: "2026-10-19T00:00:00Z",
    id: "recipe-test",
    slug: "tomato-toast",
    title: "Tomato toast",
    active: true,
    description: "Toast with tomatoes.",
    recipeMarkupApproved: true,
    image: photo,
    tags: [],
    relatedProductIds: [],
    prepMinutes: 10,
    totalMinutes: 20,
    ingredientGroups: [
      {
        _key: "i",
        _type: "recipeIngredientGroup",
        ingredients: ["Focaccia", "Tomatoes"],
      },
    ],
    steps: [{ _key: "s", _type: "recipeStep", body: "Toast the focaccia." }],
  };
  const path = detailPath("recipes", recipe.slug);
  assert.deepEqual(recipeEntity(path, recipe)?.recipeIngredient, [
    "Focaccia",
    "Tomatoes",
  ]);
  assert.equal(
    recipeEntity(path, recipe)?.recipeInstructions[0].text,
    "Toast the focaccia.",
  );
  assert.equal(recipeEntity(path, recipe)?.prepTime, "PT10M");
  assert.equal(recipeEntity(path, recipe)?.cookTime, undefined);
  assert.equal(recipeEntity(path, { ...recipe, steps: [] }), undefined);
  assert.equal(
    recipeEntity(path, { ...recipe, recipeMarkupApproved: false }),
    undefined,
  );
  assert.equal(
    recipeEntity(path, {
      ...recipe,
      image: { ...photo, alt: "Recipe photography placeholder" },
    }),
    undefined,
  );
  assert.equal(approvedPhoto({ ...photo, decorative: true }), undefined);
});

test("business data stays an Organization when no approved public street is published", () => {
  const [organization, website] = businessEntities(null, null);
  assert.equal(organization["@type"], "Organization");
  assert.equal(organization.address, undefined);
  assert.equal(website.publisher["@id"], organization["@id"]);
  assert.equal(Object.hasOwn(website, "potentialAction"), false);
});
