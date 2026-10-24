export const specialOrderConfig = {
  minimumProductSubtotal: 4000,
  fee: 1000,
  leadTimeDays: 5,
  minimumMessage:
    "Special orders require a minimum $40 product purchase plus a $10 special-order fee.",
  workflow: ["Your request", "Bakery review", "Approval", "Payment"],
} as const;
