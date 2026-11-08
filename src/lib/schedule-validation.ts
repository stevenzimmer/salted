import { z } from "zod";
export const scheduleInput = z.object({
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
