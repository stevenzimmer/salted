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
  quantity: string;
  eventType: string;
  notes: string;
};

export type SpecialOrderErrors = Partial<
  Record<keyof SpecialOrderInput, string>
>;

export function validateSpecialOrder(
  input: SpecialOrderInput,
  now = new Date(),
): SpecialOrderErrors {
  const errors: SpecialOrderErrors = {};
  if (input.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "Enter a valid email address.";
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15)
    errors.phone = "Enter a phone number with 10–15 digits.";
  const parsed = new Date(`${input.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== input.date
  )
    errors.date = "Choose a valid date.";
  else if (input.date < minimumSpecialOrderDate(now))
    errors.date = `Please allow at least ${specialOrderConfig.leadTimeDays} days.`;
  if (input.products.trim().length < 10)
    errors.products =
      "Tell us a little more about the bread you have in mind (at least 10 characters).";
  if (
    !/^\d+$/.test(input.quantity) ||
    Number(input.quantity) < 1 ||
    Number(input.quantity) > 1000
  )
    errors.quantity = "Enter an approximate quantity between 1 and 1,000.";
  return errors;
}
