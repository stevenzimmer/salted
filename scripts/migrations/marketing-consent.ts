// One-time migration copy, never a storefront fallback.
export const initialMarketingConsentCopy = {
  label:
    "Email me Salted Focaccia newsletters, new menus and occasional offers. I can unsubscribe anytime.",
};
export function migrateMarketingConsentCopy(document: Record<string, unknown>) {
  if ("marketingConsent" in document) return null;
  return { marketingConsent: initialMarketingConsentCopy };
}
