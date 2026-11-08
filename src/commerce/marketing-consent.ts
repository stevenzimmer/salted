import { clean, hasText } from "../sanity/lib/content";
import { CommerceError, hash, type CheckoutInput } from "./validation";

export type MarketingConsentSnapshot = {
  optIn: boolean;
  text: string | null;
  version: string | null;
  source: "checkout_drawer" | null;
};

export const noMarketingConsent: MarketingConsentSnapshot = {
  optIn: false,
  text: null,
  version: null,
  source: null,
};

export function resolveMarketingConsent(
  input: Pick<CheckoutInput, "marketingOptIn" | "marketingConsentText">,
  publishedLabel: string | null | undefined,
): MarketingConsentSnapshot {
  if (!input.marketingOptIn) return noMarketingConsent;
  const text = clean(publishedLabel).trim();
  if (
    !hasText(text) ||
    text.length > 2000 ||
    input.marketingConsentText !== text
  )
    throw new CommerceError(
      "marketing_consent_changed",
      "The newsletter signup wording changed. Refresh and review it again, or uncheck the newsletter option to continue.",
    );
  return { optIn: true, text, version: hash(text), source: "checkout_drawer" };
}
