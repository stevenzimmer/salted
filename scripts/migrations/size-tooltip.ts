import { isRecord } from "./navigation";

export function migrateSizeTooltip(document: Record<string, unknown>) {
  if (!isRecord(document.product) || "selectSizeTooltip" in document.product)
    return null;
  return { "product.selectSizeTooltip": "Please select a size" };
}
