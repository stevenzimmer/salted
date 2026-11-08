import { z } from "zod";
import { pickupConfig } from "../data/pickup-config";
import { pacificCutoff, pacificToday } from "../data/pickup-dates";
import type { PickupDate } from "../types/content";

export const pickupDayInput = z.iso
  .date()
  .refine(
    (day) => new Date(`${day}T12:00:00Z`).getUTCDay() === pickupConfig.weekday,
    "Choose a Friday.",
  );
export const blackoutDatesInput = z.array(pickupDayInput).max(500);

export function pickupCutoff(day: string): Date {
  const cutoff = new Date(`${pickupDayInput.parse(day)}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - pickupConfig.cutoffDaysBefore);
  return new Date(pacificCutoff(cutoff.toISOString().slice(0, 10)));
}

export function fridayPickup(
  day: string,
  blackoutDates: readonly string[],
): PickupDate | undefined {
  if (!pickupDayInput.safeParse(day).success) return undefined;
  return {
    id: day,
    date: day,
    pickupStart: pickupConfig.start,
    pickupEnd: pickupConfig.end,
    orderCutoff: pickupCutoff(day).toISOString(),
    enabled: !blackoutDates.includes(day),
  };
}

// A small initial calendar window; navigation/checkout validate any future Friday.
export function upcomingFridays(
  blackoutDates: readonly string[],
  now = new Date(),
): PickupDate[] {
  const first = new Date(`${pacificToday(now)}T12:00:00Z`);
  first.setUTCDate(first.getUTCDate() + 1);
  while (first.getUTCDay() !== pickupConfig.weekday)
    first.setUTCDate(first.getUTCDate() + 1);
  return Array.from({ length: 12 + blackoutDates.length }, (_, index) => {
    const friday = new Date(first);
    friday.setUTCDate(first.getUTCDate() + index * 7);
    return fridayPickup(friday.toISOString().slice(0, 10), blackoutDates);
  }).filter((date): date is PickupDate => date !== undefined);
}
