import { z } from "zod";
import { blackoutDatesInput } from "./pickup-policy";
export const scheduleInput = z.object({
  recurring: z
    .object({
      blackoutDates: blackoutDatesInput,
      offerings: z
        .array(
          z.object({
            productId: z.string().min(1).max(100),
            variantId: z.string().min(1).max(100),
          }),
        )
        .max(10000),
    })
    .optional(),
  dates: z
    .array(
      z.object({
        id: z.string(),
        date: z.iso.date(),
        pickupStart: z.string(),
        pickupEnd: z.string(),
        orderCutoff: z.iso.datetime({ offset: true }),
        enabled: z.boolean(),
      }),
    )
    .max(500),
  availability: z
    .array(
      z.object({
        pickupDateId: z.string(),
        productId: z.string(),
        variantId: z.string(),
        inventory: z.number().int().nonnegative().nullable(),
      }),
    )
    .max(10000),
});
