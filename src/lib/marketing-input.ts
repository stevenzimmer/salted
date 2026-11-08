import { z } from "zod";

export const marketingEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());
export const unsubscribeToken = z
  .string()
  .max(100)
  .regex(
    /^v1\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]{43}$/,
  );
export const unsubscribeInput = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), email: marketingEmail }).strict(),
  z.object({ method: z.literal("token"), token: unsubscribeToken }).strict(),
]);
