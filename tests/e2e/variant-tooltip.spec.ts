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

test("disabled add and quantity controls explain size selection on hover and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
    const button = purchase.locator(".add-button");
    const trigger = purchase.locator(".add-button-tooltip-trigger");
    const tooltip = page.getByRole("tooltip");
    await expect(button).toBeDisabled();
    await expect(async () => {
      await page.mouse.move(0, 0, { steps: 10 });
      await trigger.hover();
      await expect(tooltip).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(tooltip).toHaveText("Please select a size");
    await page.mouse.move(0, 0, { steps: 10 });
    await expect(tooltip).toHaveCount(0);
    await trigger.focus();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    await expect(purchase.locator('input[type="radio"]:checked')).toHaveCount(
      0,
    );
    const quantity = purchase.locator(".quantity-control");
    await expect(quantity.locator("button:disabled")).toHaveCount(2);
    const bounds = await quantity.boundingBox();
    if (!bounds) throw new Error("Quantity controls must be visible.");
    for (const x of [14, bounds.width - 14]) {
      await quantity.hover({ position: { x, y: bounds.height / 2 } });
      await expect(tooltip).toHaveText("Please select a size");
      await page.mouse.move(0, 0, { steps: 10 });
      await expect(tooltip).toHaveCount(0);
    }
    await quantity.focus();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
    await purchase
      .locator('input[type="radio"]:not([disabled])')
      .first()
      .check();
    await expect(button).toBeEnabled();
    await expect(quantity).not.toHaveAttribute("data-size-required");
    await quantity.hover({ position: { x: 14, y: bounds.height / 2 } });
    await expect(tooltip).toHaveCount(0);
    await quantity.getByRole("button", { name: /^Increase/ }).click();
    await expect(quantity.getByRole("status")).toHaveText("2");
    await expect(trigger).toHaveCount(0);
    await button.hover();
    await expect(tooltip).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
