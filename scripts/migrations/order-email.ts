import { isRecord } from "./navigation";

// User-approved pickup details. Migration artifact only, never a runtime fallback.
export const initialOrderEmailPickup = {
  pickupAddress: "4528 Mountaingate Dr, Rocklin, CA",
  pickupDirectionsLabel: "Get directions on Google Maps",
  pickupDirectionsUrl:
    "https://www.google.com/maps/dir//4528+Mountaingate+Dr,+Rocklin,+CA+95765/@38.8288263,-121.2517105,18z/data=!4m18!1m8!3m7!1s0x809b18978dae1339:0x2d733248c6326560!2s4528+Mountaingate+Dr,+Rocklin,+CA+95765!3b1!8m2!3d38.8291708!4d-121.2506456!16s%2Fg%2F11c10prwbx!4m8!1m0!1m5!1m1!1s0x809b18978dae1339:0x2d733248c6326560!2m2!1d-121.2506456!2d38.8291708!3e0?entry=ttu&g_ep=EgoyMDI2MTExMC4wIKXMDSoASAFQAw%3D%3D",
};
// Migration artifact only. Runtime sends read published CMS wording.
export const initialOrderEmailCopy = {
  ...initialOrderEmailPickup,
  customerSubject: "Your Salted order",
  customerHeading: "Your order is confirmed.",
  customerBody:
    "Thank you for your order. Your order and pickup details are below.",
  businessSubject: "New paid Salted order",
  businessHeading: "A new order is confirmed.",
  businessBody:
    "Payment has been verified. Order and customer details are below.",
  pickupLabel: "Pickup",
  orderLabel: "Order",
  totalLabel: "Order total",
  customerLabel: "Customer",
  receiptLink: "View Stripe receipt",
  confirmationLink: "View order confirmation",
  footer: "Questions about your order? Reply to this email.",
  openConfirmation: "View order confirmation",
  openingConfirmation: "Opening your confirmation…",
  confirmationError:
    "We couldn’t open this confirmation. Try again or contact the bakery.",
};
export function migrateOrderEmailCopy(document: Record<string, unknown>) {
  return "orderEmail" in document
    ? null
    : { orderEmail: initialOrderEmailCopy };
}

export function migrateOrderEmailPickup(document: Record<string, unknown>) {
  const group = document.orderEmail;
  // Preserve intentionally cleared groups and every existing field, including empty values.
  if (
    !isRecord(group) ||
    !Object.keys(group).some((key) => !key.startsWith("_"))
  )
    return null;
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(initialOrderEmailPickup)) {
    if (!(key in group)) updates[`orderEmail.${key}`] = value;
  }
  return Object.keys(updates).length ? updates : null;
}
