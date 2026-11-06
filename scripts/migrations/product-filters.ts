import { createHash } from "node:crypto";
import { isRecord } from "./navigation";

const legacyFilters = [
  ["focacciaFilter", "focaccia"],
  ["sourdoughFilter", "sourdough"],
  ["allFilter", "all"],
] as const;

// Historical strings are migration input only. Runtime matching uses document IDs.
export function categoryDocument(value: string) {
  if (!value.trim())
    throw new Error("Empty legacy category; no changes committed.");
  const key = /^[a-z0-9-]{1,80}$/.test(value)
    ? value
    : createHash("sha256").update(value).digest("hex").slice(0, 32);
  return {
    _id: `product-category-${key}`,
    _type: "productCategory" as const,
    internalName: value,
    title:
      value === "focaccia"
        ? "Focaccia"
        : value === "sourdough"
          ? "Sourdough"
          : value,
  };
}
export function migrateProductCategory(document: Record<string, unknown>) {
  if (typeof document.category !== "string") return null;
  const category = categoryDocument(document.category);
  return {
    set: { category: { _type: "reference", _ref: category._id } },
    unset: [] as string[],
    categories: [category],
  };
}
export function migrateProductFilters(document: Record<string, unknown>) {
  const product = document.product;
  if (!isRecord(product)) return null;
  const legacy = legacyFilters.filter(([field]) => field in product);
  if ("filters" in product && !Array.isArray(product.filters))
    throw new Error("Invalid product.filters; no changes committed.");
  const source: unknown[] = Array.isArray(product.filters)
    ? product.filters
    : legacy.flatMap(([field, category]) => {
        const label = product[field];
        if (label == null) return [];
        if (typeof label !== "string")
          throw new Error("Invalid legacy filter label; no changes committed.");
        return [{ _key: category, _type: "productFilter", category, label }];
      });
  const categories: ReturnType<typeof categoryDocument>[] = [];
  let changed = !("filters" in product) && legacy.length > 0;
  const filters = source.map((filter) => {
    if (!isRecord(filter))
      throw new Error("Invalid filter entry; no changes committed.");
    if (typeof filter.category !== "string") return filter;
    changed = true;
    if (filter.category === "all") {
      const rest = { ...filter };
      delete rest.category;
      return { ...rest, showAll: true };
    }
    const category = categoryDocument(filter.category);
    categories.push(category);
    return {
      ...filter,
      showAll: false,
      category: { _type: "reference", _ref: category._id },
    };
  });
  if (!changed && !legacy.length) return null;
  return {
    set: changed ? { "product.filters": filters } : {},
    unset: legacy.map(([field]) => `product.${field}`),
    categories,
  };
}
