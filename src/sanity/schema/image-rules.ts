import type { ImageValue } from "sanity";

export const IMAGE_SIZE_LIMIT_BYTES = 400_000;
export const IMAGE_SIZE_ERROR =
  "Images must be under 400 KB (400,000 bytes). Compress or resize the image and try again.";

export function imageDescription(dimensions: string): string {
  return `Recommended dimensions: ${dimensions}. Recommended formats: .jpg, .jpeg or .webp. File size must be under 400 KB (400,000 bytes).`;
}

export function imageSizeValidation(size: number | undefined): true | string {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return "Unable to verify the image file size. Select the image again or upload a replacement.";
  }
  return size < IMAGE_SIZE_LIMIT_BYTES || IMAGE_SIZE_ERROR;
}

export async function validateImageAssetSize(
  value: ImageValue | undefined,
  loadAsset: (id: string) => Promise<{ size?: number } | undefined>,
): Promise<true | string> {
  const ref = value?.asset?._ref;
  if (!ref) return true;

  try {
    const asset = await loadAsset(ref);
    return imageSizeValidation(asset?.size);
  } catch {
    return "Unable to verify the image file size. Check your connection and try again.";
  }
}
