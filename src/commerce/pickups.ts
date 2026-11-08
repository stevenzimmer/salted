import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { pickupDates } from "../db/schema";
import { pickupConfig } from "../data/pickup-config";
import { pickupCutoff } from "../lib/pickup-policy";
import { calendarDay, CommerceError } from "./validation";
import { isPickupOpen } from "../lib/availability";

export { pickupCutoff } from "../lib/pickup-policy";
export async function openPickupDate(
  db: Database,
  day: string,
  now = new Date(),
) {
  const date = calendarDay.parse(day),
    cutoffAt = pickupCutoff(date);
  if (
    !isPickupOpen(
      {
        id: date,
        date,
        pickupStart: pickupConfig.start,
        pickupEnd: pickupConfig.end,
        enabled: true,
        orderCutoff: cutoffAt.toISOString(),
      },
      now,
    )
  )
    throw new CommerceError(
      "pickup_closed",
      "Only a future Friday before its Wednesday Pacific cutoff can be opened.",
    );
  const [pickup] = await db
    .insert(pickupDates)
    .values({
      date,
      startTime: pickupConfig.start,
      endTime: pickupConfig.end,
      cutoffAt,
      timezone: pickupConfig.timezone,
      configurationSource: "manual",
      enabled: true,
    })
    .onConflictDoUpdate({
      target: pickupDates.date,
      set: { configurationSource: "manual", enabled: true, updatedAt: now },
      setWhere: and(
        eq(pickupDates.timezone, pickupConfig.timezone),
        eq(pickupDates.startTime, pickupConfig.start),
        eq(pickupDates.endTime, pickupConfig.end),
        eq(pickupDates.cutoffAt, cutoffAt),
      ),
    })
    .returning();
  if (!pickup)
    throw new CommerceError(
      "pickup_configuration_conflict",
      "Existing pickup hours, timezone or cutoff differ from the launch rules. Review existing commitments before changing them.",
    );
  // No inventory, sold counts, existing commitments or CMS documents are changed.
  return pickup;
}
export async function closePickupDate(db: Database, day: string) {
  calendarDay.parse(day);
  return db
    .update(pickupDates)
    .set({
      configurationSource: "manual",
      enabled: false,
      updatedAt: new Date(),
    })
    .where(eq(pickupDates.date, day))
    .returning({ date: pickupDates.date, enabled: pickupDates.enabled });
}
export async function listPickupDates(db: Database) {
  return db
    .select({
      date: pickupDates.date,
      enabled: pickupDates.enabled,
      source: pickupDates.configurationSource,
      pickupStart: pickupDates.startTime,
      pickupEnd: pickupDates.endTime,
      cutoffAt: pickupDates.cutoffAt,
    })
    .from(pickupDates)
    .orderBy(sql`${pickupDates.date} desc`)
    .limit(500);
}
