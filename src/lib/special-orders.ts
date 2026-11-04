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
  Record<
    keyof SpecialOrderInput,
    "name" | "email" | "phone" | "date" | "leadTime" | "products" | "quantity"
  >
>;

export function validateSpecialOrder(
  input: SpecialOrderInput,
  now = new Date(),
): SpecialOrderErrors {
  const errors: SpecialOrderErrors = {};
  if (input.name.trim().length < 2) errors.name = "name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    errors.email = "email";
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) errors.phone = "phone";
  const parsed = new Date(`${input.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== input.date
  )
    errors.date = "date";
  else if (input.date < minimumSpecialOrderDate(now)) errors.date = "leadTime";
  if (input.products.trim().length < 10) errors.products = "products";
  if (
    !/^\d+$/.test(input.quantity) ||
    Number(input.quantity) < 1 ||
    Number(input.quantity) > 1000
  )
    errors.quantity = "quantity";
  return errors;
}
