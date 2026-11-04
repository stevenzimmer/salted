import type { SiteSettings } from "../../sanity.types";
import { clean, hasText } from "@/sanity/lib/content";

export const MAX_NAVIGATION_ITEMS = 7;

export function navigationHref(value: unknown): string | undefined {
  if (!hasText(value)) return undefined;
  const href = clean(value).trim();
  if (
    /[\s\\]/.test(href) ||
    [...href].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    return undefined;
  if (href.startsWith("#")) return href.length > 1 ? href : undefined;
  if (href.startsWith("/")) return href.startsWith("//") ? undefined : href;
  try {
    const url = new URL(href);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) &&
      hasText(url.pathname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function navigation(
  settings: SiteSettings | null,
  field: "headerNavigation" | "footerNavigation",
) {
  // Also guard old/unmigrated data and externally imported arrays at runtime.
  const items = settings?.[field];
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_NAVIGATION_ITEMS).flatMap((item) => {
    const href = navigationHref(item?.href);
    return hasText(item?.label) && href
      ? [{ key: item._key, label: item.label, href }]
      : [];
  });
}

export function isActiveNavigationLink(
  href: string,
  pathname: string,
): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const route = href.split(/[?#]/)[0];
  return (
    pathname === route || (route !== "/" && pathname.startsWith(`${route}/`))
  );
}

export function isSamePageAnchor(href: string, pathname: string): boolean {
  return href.startsWith("#") || href.startsWith(`${pathname}#`);
}
