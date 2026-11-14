import { test, expect } from "@playwright/test";
import { fetchCatalog } from "../../src/commerce/catalog";

test("active sizes can be selected, added and updated before choosing a pickup date", async ({
  page,
}) => {
  const product = (await fetchCatalog()).find(
    (product) => product.id === "classic-focaccia",
  );
  if (!product?.active)
    throw new Error(
      "The published Classic Focaccia QA product must be active.",
    );
  const variants = (product.variants ?? []).filter(
    (variant) =>
      variant.id &&
      /^[a-z0-9-]+$/.test(variant.id) &&
      variant.label?.trim() &&
      Number.isSafeInteger(variant.price) &&
      typeof variant.price === "number" &&
      variant.price >= 0,
  );
  const active = variants.filter((variant) => variant.active !== false);
  expect(active.length).toBeGreaterThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.locator("article").filter({
    has: page.getByRole("link", {
      name: "View Classic Focaccia",
      exact: true,
    }),
  });
  for (const variant of variants) {
    const radio = card.locator(`input[type="radio"][value="${variant.id}"]`);
    if (variant.active === false) await expect(radio).toBeDisabled();
    else await expect(radio).toBeEnabled();
  }
  const first = card.locator(`input[type="radio"][value="${active[0].id}"]`);
  await expect(card.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(card.locator(".add-button")).toBeDisabled();
  await first.check();
  await expect(first).toBeChecked();
  await first.focus();
  await first.press("ArrowRight");
  await expect(
    card.locator(`input[type="radio"][value="${active[1].id}"]`),
  ).toBeChecked();
  await expect(card.locator(".add-button")).toBeEnabled();
  await card.getByRole("button", { name: /Increase quantity for/ }).click();
  await expect(
    card.getByRole("status", {
      name: "Quantity for Classic Focaccia",
      exact: true,
    }),
  ).toHaveText("2");
  await card.locator(".add-button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Increase .* quantity$/ }).click();
  await expect(dialog.getByRole("status", { name: / quantity$/ })).toHaveText(
    "3",
  );
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("salted:cart:v1") ?? "[]"),
  );
  expect(stored).toEqual([
    { productId: "classic-focaccia", variantId: active[1].id, quantity: 3 },
  ]);
  await dialog.getByRole("button", { name: /^Checkout/ }).click();
  await expect(dialog.getByRole("grid")).toBeVisible();
  await expect(
    dialog.getByRole("status").filter({ hasText: /^Selected / }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Continue to Stripe", exact: true }),
  ).toHaveCount(0);
});
