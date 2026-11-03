const products = [
  ...[
    "classic-focaccia",
    "pesto-mozzarella",
    "jalapeno-cheddar",
    "parmesan-chili-crisp",
    "rosemary-olive-black-pepper",
    "seasonal-flavor",
  ].map((id) => ({
    id,
    variants: ["round", "square", "pan"].map((id) => ({ id })),
  })),
  ...["classic-sourdough", "specialty-sourdough"].map((id) => ({
    id,
    variants: [{ id: "loaf" }],
  })),
];
import { createPickupDates } from "./pickup-dates";
import type {
  MockSchedule,
  PickupDate,
  ProductAvailability,
} from "@/types/content";

export function createMockAvailability(
  dates: PickupDate[],
): ProductAvailability[] {
  return dates.flatMap((date, index) =>
    products.flatMap((product) =>
      product.variants.map((variant) => ({
        pickupDateId: date.id,
        productId: product.id,
        variantId: variant.id,
        inventory:
          product.id === "seasonal-flavor"
            ? 0
            : product.id === "parmesan-chili-crisp" && index % 2 === 0
              ? 0
              : product.id === "specialty-sourdough"
                ? 3
                : product.id === "jalapeno-cheddar" && variant.id === "pan"
                  ? 0
                  : variant.id === "pan"
                    ? 6
                    : 12,
      })),
    ),
  );
}

export function getMockSchedule(now = new Date()): MockSchedule {
  const dates = createPickupDates(now);
  return { dates, availability: createMockAvailability(dates) };
}
