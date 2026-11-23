import type { FrameLocator, Page } from "@playwright/test";

export const sandboxPhone = "+19165550142";

export async function fillStripePaymentForm(
  page: Page,
  {
    email,
    name,
    cardNumber = "4242424242424242",
  }: { email: string; name: string; cardNumber?: string },
): Promise<FrameLocator> {
  const form = page.frameLocator('iframe[title="Secure embedded form frame"]');
  await form.locator('input[autocomplete="email"]').fill(email);
  await form.locator('input[autocomplete="tel"]').fill(sandboxPhone.slice(2));
  await form.getByPlaceholder("Full name", { exact: true }).fill(name);
  await form
    .getByRole("textbox", { name: "Card number", exact: true })
    .fill(cardNumber);
  await form.getByRole("textbox", { name: /^Expiration/ }).fill("1230");
  await form
    .getByRole("textbox", { name: "Security code", exact: true })
    .fill("123");
  await form
    .getByRole("textbox", { name: "Name on card", exact: true })
    .fill(name);
  await form
    .getByRole("textbox", { name: "ZIP code", exact: true })
    .fill("95677");
  return form;
}
