import "server-only";
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
export async function storefrontSchedule(): Promise<MockSchedule> {
  try {
    return await liveSchedule();
  } catch {
    console.error("Pickup availability unavailable; ordering closed.");
    return { dates: [], availability: [] };
  }
}
