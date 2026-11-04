import { MAX_NAVIGATION_ITEMS } from "../../src/lib/navigation";
import { hasText } from "../../src/sanity/lib/content";
import { isRecord } from "./navigation";

function menu(value: unknown): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isRecord))
    throw new Error("Unexpected navigation data; no changes made.");
  return value;
}

export function separateNavigation(document: Record<string, unknown>) {
  const set: Record<string, Record<string, unknown>[]> = {};
  const unset: string[] = [];
  if (document.headerNavigation === undefined)
    set.headerNavigation = menu(document.navigation);
  if (document.footerNavigation === undefined) {
    const footer = [...menu(document.navigation)];
    const storage = isRecord(document.utilityLabels)
      ? document.utilityLabels.storage
      : undefined;
    if (
      hasText(storage) &&
      !footer.some((item) => item.href === "/storage-heating")
    ) {
      let key = "footer-storage";
      for (let i = 2; footer.some((item) => item._key === key); i++)
        key = `footer-storage-${i}`;
      footer.push({
        _key: key,
        _type: "navigationItem",
        label: storage,
        href: "/storage-heating",
      });
    }
    set.footerNavigation = footer;
  }
  for (const [field, items] of Object.entries(set)) {
    if (items.length > MAX_NAVIGATION_ITEMS)
      throw new Error(
        `${field} would contain ${items.length} items. Migration stopped to preserve all items; resolve the seven-item limit before retrying.`,
      );
  }
  if ("navigation" in document) unset.push("navigation");
  if (isRecord(document.utilityLabels) && "storage" in document.utilityLabels)
    unset.push("utilityLabels.storage");
  return Object.keys(set).length || unset.length ? { set, unset } : null;
}
