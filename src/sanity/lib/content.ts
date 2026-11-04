import type { StegaBranded } from "@sanity/client/stega";
import { stegaClean } from "@sanity/client/stega";
import type { ImageWithAlt, PortableText } from "../../../sanity.types";

export function hasText(value: unknown): value is string {
  return typeof value === "string" && stegaClean(value).trim().length > 0;
}
export function hasItems<T>(
  value: readonly T[] | null | undefined,
): value is readonly T[] {
  return Array.isArray(value) && value.length > 0;
}
export function hasImage(
  value: ImageWithAlt | null | undefined,
): value is ImageWithAlt & { asset: { _ref: string } } {
  return (
    !!value &&
    (value.decorative === true || hasText(value.alt)) &&
    hasText(value.asset?._ref) &&
    /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/.test(stegaClean(value.asset._ref))
  );
}
export type CmsPortableText = PortableText | StegaBranded<PortableText>;
export function hasPortableTextContent(
  value: CmsPortableText | null | undefined,
): value is CmsPortableText {
  return !!value?.some(
    (block) =>
      block._type === "block" &&
      block.children?.some((span) => hasText(span.text)),
  );
}
export function visibleBlocks(
  value: CmsPortableText | null | undefined,
): PortableText {
  return (
    value
      ?.filter((block) => block.children?.some((span) => hasText(span.text)))
      .map((block) => ({
        ...block,
        style:
          clean(block.style) === "h2"
            ? "h2"
            : clean(block.style) === "h3"
              ? "h3"
              : "normal",
        listItem:
          clean(block.listItem) === "bullet"
            ? "bullet"
            : clean(block.listItem) === "number"
              ? "number"
              : undefined,
      })) ?? []
  );
}
// Only editorial values count. Internal IDs, reference IDs, booleans and numbers
// cannot keep an otherwise empty optional text slot alive.
export function hasCopy(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return (
    !!value &&
    Object.entries(value).some(
      ([key, text]) => !key.startsWith("_") && hasText(text),
    )
  );
}
export function clean(value: string | null | undefined): string {
  return value ? stegaClean(value) : "";
}
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!hasText(value)) return undefined;
  const url = clean(value).trim();
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("\\"))
    return url;
  try {
    const parsed = new URL(url);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function interpolate(
  value: string | null | undefined,
  replacements: Record<string, string | number>,
): string {
  if (!hasText(value)) return "";
  return value.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in replacements ? String(replacements[key]) : match,
  );
}
