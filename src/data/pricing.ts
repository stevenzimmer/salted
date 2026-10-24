import type { ProductVariant } from "@/types/content";

export const pricing = {
  classicFocaccia: [700, 1300, 1900],
  specialtyFocaccia: [800, 1500, 2200],
  classicSourdough: 1200,
  specialtySourdough: 1500,
} as const;

export const focacciaSizes = [
  {
    id: "round",
    label: '6" Round',
    shortLabel: '6" round',
    servingDescription: "Perfect for a personal size or to pair with a meal.",
  },
  {
    id: "square",
    label: '8" × 8" Square',
    shortLabel: '8" × 8"',
    servingDescription: "Great for sharing — serves 4–6.",
  },
  {
    id: "pan",
    label: '9" × 13" Pan',
    shortLabel: '9" × 13"',
    servingDescription:
      "Our full-size focaccia — perfect for gatherings. Serves 8–12.",
  },
] as const;

export function focacciaVariants(
  tier: "classic" | "specialty",
): ProductVariant[] {
  const prices =
    tier === "classic" ? pricing.classicFocaccia : pricing.specialtyFocaccia;
  return focacciaSizes.map((size, index) => ({
    ...size,
    price: prices[index],
  }));
}
