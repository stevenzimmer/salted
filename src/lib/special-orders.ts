import { z } from "zod";
import { marketingEmail } from "./marketing-input";
import { specialOrderConfig } from "@/data/special-order-config";
import { pacificToday } from "@/data/pickup-dates";

export function minimumSpecialOrderDate(now = new Date()): string {
  const date = new Date(`${pacificToday(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + specialOrderConfig.leadTimeDays);
  return date.toISOString().slice(0, 10);
}

export type SpecialOrderInput = {
  name: string;
  email: string;
  phone: string;
  date: string;
  products: string;
};

export type SpecialOrderErrors = Partial<
  Record<
    keyof SpecialOrderInput,
    "name" | "email" | "phone" | "date" | "leadTime" | "products"
  >
>;

export function validateSpecialOrder(
  input: SpecialOrderInput,
  now = new Date(),
): SpecialOrderErrors {
  const errors: SpecialOrderErrors = {};
  if (input.name.trim().length < 2 || input.name.length > 120)
    errors.name = "name";
  if (!marketingEmail.safeParse(input.email).success) errors.email = "email";
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15 || input.phone.length > 30)
    errors.phone = "phone";
  const parsed = new Date(`${input.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== input.date
  )
    errors.date = "date";
  else if (input.date < minimumSpecialOrderDate(now)) errors.date = "leadTime";
  if (input.products.trim().length < 10 || input.products.length > 3000)
    errors.products = "products";
  return errors;
}

export const specialOrderSubmissionInput = z
  .object({
    requestKey: z.uuid(),
    name: z.string().trim().min(2).max(120),
    email: marketingEmail,
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      }),
    date: z.string().max(10),
    products: z.string().trim().min(10).max(3000),
    marketingOptIn: z.boolean().default(false),
    marketingConsentText: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.marketingOptIn && !input.marketingConsentText?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["marketingConsentText"],
        message: "Newsletter wording is required.",
      });
  });
export type SpecialOrderSubmission = z.infer<
  typeof specialOrderSubmissionInput
>;
