import { plainTextToPortableText } from "../../src/sanity/lib/plain-text-to-portable-text";
import { isRecord } from "./navigation";
import type { PortableText } from "../../sanity.types";

export function migrateStorageRichText(document: Record<string, unknown>) {
  if (document._type !== "storageHeatingPage" || !isRecord(document.guide))
    return null;
  const updates: Record<string, PortableText> = {};
  for (const field of [
    "shortTermBody",
    "freezerBody",
    "ovenBody",
    "servingBody",
  ]) {
    const value = document.guide[field];
    if (typeof value === "string")
      updates[`guide.${field}`] = plainTextToPortableText(value);
  }
  return Object.keys(updates).length ? updates : null;
}
