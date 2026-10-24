import type {
  CartItem,
  MockSchedule,
  PickupDate,
  ProductAvailability,
} from "@/types/content";
import { pacificToday } from "@/data/pickup-dates";

export function isPickupOpen(date: PickupDate, now = new Date()): boolean {
  return (
    date.enabled &&
    date.date > pacificToday(now) &&
    new Date(date.orderCutoff).getTime() > now.getTime()
  );
}

export function inventoryFor(
  availability: ProductAvailability[],
  pickupDateId: string,
  productId: string,
  variantId: string,
): number {
  return (
    availability.find(
      (row) =>
        row.pickupDateId === pickupDateId &&
        row.productId === productId &&
        row.variantId === variantId,
    )?.inventory ?? 0
  );
}

export function validPickupDates(
  items: CartItem[],
  schedule: MockSchedule,
  now = new Date(),
): PickupDate[] {
  if (items.length === 0) return [];
  // Aggregate first: duplicate lines must never bypass the inventory comparison.
  const quantities = new Map<string, CartItem>();
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) return [];
    const key = `${item.productId}:${item.variantId}`;
    const existing = quantities.get(key);
    quantities.set(key, {
      ...item,
      quantity: item.quantity + (existing?.quantity ?? 0),
    });
  }
  return schedule.dates.filter(
    (date) =>
      isPickupOpen(date, now) &&
      [...quantities.values()].every(
        (item) =>
          inventoryFor(
            schedule.availability,
            date.id,
            item.productId,
            item.variantId,
          ) >= item.quantity,
      ),
  );
}

export function maximumInventory(
  schedule: MockSchedule,
  productId: string,
  variantId: string,
  now = new Date(),
): number {
  return Math.max(
    0,
    ...schedule.dates
      .filter((date) => isPickupOpen(date, now))
      .map((date) =>
        inventoryFor(schedule.availability, date.id, productId, variantId),
      ),
  );
}
