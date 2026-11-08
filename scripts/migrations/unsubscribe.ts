// One-time editorial migration, never a frontend fallback.
export const initialUnsubscribeCopy = {
  eyebrow: "Email preferences",
  title: "Unsubscribe",
  description:
    "Enter your email address to stop receiving Salted Focaccia newsletters, new menus and offers.",
  emailLabel: "Email address",
  emailPlaceholder: "you@example.com",
  submit: "Unsubscribe",
  busy: "Saving…",
  confirmationHeading: "Your preferences are saved.",
  confirmationBody:
    "This address will no longer receive marketing emails from Salted Focaccia. Necessary order and pickup messages are separate.",
  tokenHeading: "Stop marketing emails?",
  tokenDescription:
    "Confirm below to unsubscribe the email address associated with this link.",
  confirm: "Confirm unsubscribe",
  invalidEmail: "Enter a valid email address.",
  invalidLink:
    "This link is invalid. You can unsubscribe by entering your email address below.",
  error: "We couldn’t save your preference. Please try again.",
  rateLimited: "Too many requests. Please wait five minutes and try again.",
  backHome: "Back to Salted",
};
export function migrateUnsubscribeCopy(document: Record<string, unknown>) {
  if ("unsubscribe" in document) return null;
  return { unsubscribe: initialUnsubscribeCopy };
}
export function migrateUnsubscribeNavigation(
  document: Record<string, unknown>,
) {
  const items = document.footerNavigation;
  // Preserve deliberately cleared/missing/full menus and existing editor choices.
  if (!Array.isArray(items) || !items.length || items.length >= 7) return null;
  if (
    items.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "href" in item &&
        item.href === "/unsubscribe",
    )
  )
    return null;
  let key = "unsubscribe";
  while (
    items.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "_key" in item &&
        item._key === key,
    )
  )
    key += "-link";
  return {
    footerNavigation: [
      ...items,
      {
        _key: key,
        _type: "navigationItem",
        label: "Email preferences",
        href: "/unsubscribe",
      },
    ],
  };
}
