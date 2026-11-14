import { isRecord } from "./navigation";

// Migration copy only; the storefront reads this field from Sanity.
export function migrateSpecialOrderForm(document: Record<string, unknown>) {
  if (!isRecord(document.form) || "productsDescription" in document.form)
    return null;
  return {
    "form.productsDescription":
      "Tell us which breads, flavors, and sizes you have in mind, the approximate quantity, the type of event or occasion, and any additional notes or questions.",
  };
}
