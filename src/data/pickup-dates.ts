import { pickupConfig } from "./pickup-config";
import type { PickupDate } from "@/types/content";

export function pacificToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: pickupConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function pacificCutoff(day: string): string {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: pickupConfig.timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((part) => part.type === "timeZoneName")?.value;
  if (offset !== "GMT-7" && offset !== "GMT-8")
    throw new Error("Unexpected Pacific timezone offset");
  return `${day}T23:59:59${offset === "GMT-7" ? "-07:00" : "-08:00"}`;
}

export function createPickupDates(now = new Date()): PickupDate[] {
  const today = new Date(`${pacificToday(now)}T12:00:00Z`);
  const first = new Date(today);
  // Include a past Friday so past/closed behavior is represented in the mock.
  first.setUTCDate(
    today.getUTCDate() -
      ((today.getUTCDay() - pickupConfig.weekday + 7) % 7) -
      7,
  );
  return Array.from({ length: 12 }, (_, index) => {
    const friday = new Date(first);
    friday.setUTCDate(first.getUTCDate() + index * 7);
    const cutoff = new Date(friday);
    cutoff.setUTCDate(friday.getUTCDate() - pickupConfig.cutoffDaysBefore);
    const date = friday.toISOString().slice(0, 10);
    return {
      id: date,
      date,
      pickupStart: pickupConfig.start,
      pickupEnd: pickupConfig.end,
      orderCutoff: pacificCutoff(cutoff.toISOString().slice(0, 10)),
      enabled: index !== 4, // One closed bakery week to demonstrate disabled dates.
    };
  });
}
