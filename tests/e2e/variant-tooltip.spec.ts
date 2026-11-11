import { test, expect } from "@playwright/test";

test("unavailable sizes show Sold out on hover and keyboard focus while remaining disabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const path of ["/", "/products/classic-focaccia"]) {
    await page.goto(path);
    const purchase =
      path === "/"
        ? page.locator(".product-card").filter({
            has: page.locator(
              '.product-heading a[href="/products/classic-focaccia"]',
            ),
          })
        : page.locator(".product-detail-grid");
    const unavailable = purchase
      .locator(".variant-option.is-unavailable")
      .first();
    await expect(unavailable.locator("input")).toBeDisabled();
    const tooltip = page.getByRole("tooltip");
    // Hover events before hydration are not replayed; retry the pointer entry
    // until the Client Component is ready to handle it.
    await expect(async () => {
      await page.mouse.move(0, 0, { steps: 10 });
      await unavailable.hover();
      await expect(tooltip).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(tooltip).toHaveText(/^sold out$/i);
    await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0, { steps: 10 });
    await expect(tooltip).toHaveCount(0);
    await unavailable.focus();
    await expect(unavailable).toBeFocused();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    await expect(unavailable.locator("input")).toBeDisabled();
    await expect(purchase.locator('input[type="radio"]:checked')).toHaveCount(
      0,
    );
    const active = purchase
      .locator(".variant-option:not(.is-unavailable)")
      .first();
    await active.hover();
    await expect(tooltip).toHaveCount(0);
    await active.locator("input").check();
    await expect(purchase.locator(".add-button")).toBeEnabled();
  }
});
