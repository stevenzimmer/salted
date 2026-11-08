import type {
  CartItem,
  MockSchedule,
  PickupDate,
  ProductAvailability,
} from "@/types/content";
import { pacificToday } from "@/data/pickup-dates";
import { fridayPickup, upcomingFridays } from "./pickup-policy";
import { MAX_CART_QUANTITY } from "./cart";

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
  const row = availability.find(
    (row) =>
      row.pickupDateId === pickupDateId &&
      row.productId === productId &&
      row.variantId === variantId,
  );
  if (!row) return 0;
  // Infinity is internal arithmetic only; the wire format uses explicit null.
  return row.inventory === null ? Number.POSITIVE_INFINITY : row.inventory;
}

export function validPickupDates(
  items: CartItem[],
  schedule: MockSchedule,
  now = new Date(),
): PickupDate[] {
  if (schedule.recurring)
    return upcomingFridays(schedule.recurring.blackoutDates, now).flatMap(
      (date) => {
        const available = pickupDateForCart(items, schedule, date.date, now);
        return available ? [available] : [];
      },
    );
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

export function pickupDateForCart(
  items: CartItem[],
  schedule: MockSchedule,
  day: string,
  now = new Date(),
): PickupDate | undefined {
  if (!schedule.recurring)
    return validPickupDates(items, schedule, now).find(
      (date) => date.date === day,
    );
  const { blackoutDates, offerings } = schedule.recurring;
  const date = fridayPickup(day, blackoutDates);
  if (!date || !isPickupOpen(date, now) || items.length === 0) return undefined;
  const quantities = new Map<string, number>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId}`;
    const quantity = item.quantity + (quantities.get(key) ?? 0);
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      quantity > MAX_CART_QUANTITY ||
      !offerings.some(
        (offering) =>
          offering.productId === item.productId &&
          offering.variantId === item.variantId,
      )
    )
      return undefined;
    quantities.set(key, quantity);
  }
  return date;
}

export function maximumInventory(
  schedule: MockSchedule,
  productId: string,
  variantId: string,
  now = new Date(),
): number {
  if (schedule.recurring)
    return schedule.recurring.offerings.some(
      (offering) =>
        offering.productId === productId && offering.variantId === variantId,
    )
      ? Number.POSITIVE_INFINITY
      : 0;
  return Math.max(
    0,
    ...schedule.dates
      .filter((date) => isPickupOpen(date, now))
      .map((date) =>
        inventoryFor(schedule.availability, date.id, productId, variantId),
      ),
  );
}
