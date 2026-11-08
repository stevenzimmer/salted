import "server-only";
import { withDatabase } from "../db/client";
import { fetchCatalog } from "./catalog";
import { readSchedule } from "./store";
import type { MockSchedule } from "../types/content";
export async function liveSchedule(): Promise<MockSchedule> {
  const catalog = await fetchCatalog();
  return withDatabase((db) => readSchedule(db, catalog));
}
export async function storefrontSchedule(): Promise<MockSchedule> {
  try {
    return await liveSchedule();
  } catch {
    console.error("Pickup availability unavailable; ordering closed.");
    return { dates: [], availability: [] };
  }
}
