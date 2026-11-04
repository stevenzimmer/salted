// Historical field names/destinations are used only for this one-time migration.
// The running website reads each item's label and href exclusively from Sanity.
const legacyDestinations = [
  ["products", "/#products"],
  ["recipes", "/recipes"],
  ["pickup", "/pickup"],
  ["specialOrders", "/special-orders"],
  ["about", "/about"],
] as const;
const utilityKeys = ["storage", "privacy", "terms", "cart"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateSiteNavigation(document: Record<string, unknown>) {
  const legacy = document.navigation;
  // Preserve deliberately empty lists and any menu an editor has already migrated.
  if (!isRecord(legacy)) return null;
  const existingUtilities = isRecord(document.utilityLabels)
    ? document.utilityLabels
    : {};
  const utilityLabels: Record<string, string> = {};
  for (const key of utilityKeys) {
    const value =
      typeof existingUtilities[key] === "string"
        ? existingUtilities[key]
        : legacy[key];
    if (typeof value === "string") utilityLabels[key] = value;
  }
  return {
    navigation: legacyDestinations.map(([field, href], index) => ({
      _key: `nav-${index + 1}`,
      _type: "navigationItem" as const,
      href,
      ...(typeof legacy[field] === "string" ? { label: legacy[field] } : {}),
    })),
    utilityLabels,
  };
}
