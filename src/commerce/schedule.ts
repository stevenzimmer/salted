import "server-only";
import { cache } from "react";
import { fetchCatalog, fetchPickupBlackoutDates } from "./catalog";
import { buildPickupSchedule } from "./schedule-model";
import type { MockSchedule } from "../types/content";
export async function liveSchedule(): Promise<MockSchedule> {
  const [catalog, blackoutDates] = await Promise.all([
    fetchCatalog(),
    fetchPickupBlackoutDates(),
  ]);
  return buildPickupSchedule(catalog, blackoutDates);
}
export const storefrontSchedule = cache(async (): Promise<MockSchedule> => {
  try {
    return await liveSchedule();
  } catch {
    console.error("Pickup availability unavailable; ordering closed.");
    return { dates: [], availability: [] };
  }
});
