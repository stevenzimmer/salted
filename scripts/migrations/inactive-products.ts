export const inactiveProductCopy = {
  heading: "Taking a little dough break.",
  body: "This one's unavailable for now, but never say never. Check back later for future availability. Planning something special in the meantime?",
  cta: "Let's talk special orders",
};

export function migrateInactiveProductCopy(document: Record<string, unknown>) {
  // Preserve existing copy, including intentionally empty or cleared slots.
  if ("inactiveProduct" in document) return null;
  return { inactiveProduct: inactiveProductCopy };
}
