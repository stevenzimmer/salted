export const storageContent = {
  title: "Good today.\nGreat again tomorrow.",
  description:
    "A little care for your good bread. Our bakery-approved storage and reheating guide is coming soon.",
  sections: [
    {
      title: "Short-term storage",
      text: "Storage method and timing will be added after bakery approval.",
    },
    {
      title: "Into the freezer",
      text: "Freezing, wrapping, and thawing guidance will be added after bakery approval.",
    },
    {
      title: "Back to the oven",
      text: "Product-specific reheating temperatures and times are awaiting bakery approval.",
    },
    {
      title: "Bring it to the table",
      text: "Serving suggestions and finishing touches will be shared with the final guide.",
    },
  ],
};

export const legalContent = {
  privacy: {
    title: "Privacy, please.",
    description:
      "This is a local storefront preview. The final privacy policy will be reviewed before launch.",
    sections: [
      {
        title: "In this preview",
        text: "Your cart is saved in this browser’s local storage. The special-order form runs locally and does not send your details to the bakery. No payment details are collected.",
      },
      {
        title: "Before launch",
        text: "TODO: Approve the full privacy policy covering customer information, service providers, retention, cookies, analytics, and privacy requests.",
      },
    ],
  },
  terms: {
    title: "The little details.",
    description:
      "These are draft terms for the preview. Final terms require bakery and legal review before launch.",
    sections: [
      {
        title: "Preview only",
        text: "No real orders, payments, inventory reservations, or special-order requests are created by this website in Phase 1.",
      },
      {
        title: "Before launch",
        text: "TODO: Confirm ordering terms, taxes, pickup responsibilities, cancellations, refunds, missed pickups, and special-order approval terms.",
      },
    ],
  },
} as const;
