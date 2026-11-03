import type { SiteSettings } from "../../sanity.types";
import { hasText } from "@/sanity/lib/content";
const destinations = [
  ["products", "/#products"],
  ["recipes", "/recipes"],
  ["pickup", "/pickup"],
  ["specialOrders", "/special-orders"],
  ["about", "/about"],
] as const;
export function navigation(settings: SiteSettings | null) {
  return destinations.flatMap(([key, href]) => {
    const label = settings?.navigation?.[key];
    return hasText(label) ? [{ label, href }] : [];
  });
}
