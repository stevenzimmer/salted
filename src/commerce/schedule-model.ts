import { activeOfferings, type Catalog } from "./catalog";
import { blackoutDatesInput } from "../lib/pickup-policy";
import type { MockSchedule } from "../types/content";

export function buildPickupSchedule(
  catalog: Catalog,
  blackoutDates: unknown,
): MockSchedule {
  return {
    dates: [],
    availability: [],
    recurring: {
      blackoutDates: blackoutDatesInput.parse(blackoutDates ?? []),
      offerings: activeOfferings(catalog),
    },
  };
}
