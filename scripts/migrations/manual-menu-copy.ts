import { isRecord } from "./navigation";
export function migrateManualMenuCopy(document: Record<string, unknown>) {
  if (
    !isRecord(document.checkout) ||
    document.checkout.cancel !== "End my previous checkout and release its hold"
  )
    return null;
  return { "checkout.cancel": "End my previous checkout" };
}
