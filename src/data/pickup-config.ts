export const pickupConfig = {
  timezone: "America/Los_Angeles",
  weekday: 5,
  dayLabel: "Friday",
  start: "14:00",
  end: "18:00",
  hoursLabel: "2–6 pm",
  cutoffLabel: "Wednesday at 11:59 pm Pacific",
  cutoffDaysBefore: 2,
  city: "Rocklin, California",
  address: "Exact pickup address is provided after purchase.",
  policies: [
    {
      title: "Pickup address",
      copy: "TODO: Confirm the exact pickup address and arrival instructions. The full address will be provided after purchase.",
    },
    {
      title: "Missed pickup",
      copy: "TODO: Bakery approval needed for the missed-pickup policy.",
    },
    {
      title: "Cancellations",
      copy: "TODO: Bakery approval needed for cancellation deadlines and procedures.",
    },
    {
      title: "Refunds",
      copy: "TODO: Bakery approval needed for the refund policy.",
    },
  ],
} as const;
