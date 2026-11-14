import { test, expect, type Locator } from "@playwright/test";
import { createClient } from "@sanity/client";
import type { GLOBAL_QUERY_RESULT } from "../../sanity.types";
import { GLOBAL_QUERY } from "../../src/sanity/lib/queries";
import { mapProduct } from "../../src/sanity/lib/mappers";
import { clean } from "../../src/sanity/lib/content";
import { getProductImage } from "../../src/lib/product-image";
import { imageAnnotation, imageUrl } from "../../src/components/cms/image";
import type { Product, ProductVariant } from "../../src/types/content";

async function expectProductImage(
  container: Locator,
  product: Product,
  variant?: ProductVariant,
) {
  const { image, path, fallback } = getProductImage(product, variant);
  const url = fallback?.src ?? imageUrl(image, 1600, 4 / 5);
  const img = container.locator("img");
  if (!url) {
    await expect(img).toHaveCount(0);
    return;
  }
  if (fallback) {
    await expect(img).not.toHaveAttribute("data-sanity");
  } else {
    await expect(img).toHaveAttribute(
      "data-sanity",
      imageAnnotation(product._id, path, product._type),
    );
  }
  await expect(img).toHaveAttribute(
    "alt",
    fallback?.alt ?? (image?.decorative ? "" : clean(image?.alt)),
  );
  await expect
    .poll(async () => {
      const src = await img.getAttribute("src");
      if (!src) return "";
      return (
        new URL(src, "http://localhost:3000").searchParams.get("url") ?? src
      );
    })
    .toBe(url);
}

test("product cards and detail pages start with default thumbnails and change images only after size selection", async ({
  page,
}) => {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "published",
  });
  const { products: documents, commerce } =
    await client.fetch<GLOBAL_QUERY_RESULT>(GLOBAL_QUERY);
  const products = documents
    .map(mapProduct)
    .filter((product) => product !== null);
  expect(products.length).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const allFilter = commerce?.product?.filters?.find(
    (filter) => filter.showAll,
  );
  if (!allFilter || !clean(allFilter.label))
    throw new Error(
      "A published show-all menu filter is required to check every product thumbnail.",
    );
  await page
    .getByRole("group", { name: "Filter the menu" })
    .getByRole("button", {
      name: clean(allFilter.label),
      exact: true,
    })
    .click();
  for (const product of products) {
    const card = page.locator('.product-card[data-variant="default"]').filter({
      has: page.locator(`.product-heading a[href="/products/${product.slug}"]`),
    });
    await expect(card).toHaveCount(1);
    await expectProductImage(card, product);
    await expect(card.locator('input[type="radio"]:checked')).toHaveCount(0);
    await expect(card.locator(".variant-option.is-selected")).toHaveCount(0);
    for (const variant of product.variants) {
      const radio = card.locator(`input[type="radio"][value="${variant.id}"]`);
      if (variant.active === false) {
        await expect(radio).toBeDisabled();
        continue;
      }
      await radio.check();
      await expect(radio).toBeChecked();
      await expectProductImage(card, product, variant);
      await expect(card.locator(".add-button")).toBeEnabled();
    }
  }
  const product = products.find((item) =>
    item.variants.some((variant) => variant.active !== false),
  );
  if (!product)
    throw new Error(
      "An active size is required to check detail-page selection.",
    );
  await page.goto(`/products/${product.slug}`);
  const detail = page.locator(".product-detail-grid");
  await expectProductImage(detail, product);
  await expect(detail.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(detail.locator(".add-button")).toBeDisabled();
  for (const variant of product.variants.filter(
    (variant) => variant.active !== false,
  )) {
    await detail.locator(`input[type="radio"][value="${variant.id}"]`).check();
    await expectProductImage(detail, product, variant);
    await expect(detail.locator(".add-button")).toBeEnabled();
  }
});
