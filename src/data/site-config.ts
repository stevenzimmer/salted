export const siteConfig = {
  name: "Salted Focaccia",
  wordmark: "salted",
  tagline: "Sourdough focaccia + more",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://saltedfocaccia.com",
  domain: "saltedfocaccia.com",
  description:
    "Sourdough focaccia, a little extra olive oil, and something worth sharing. Browse the Salted Focaccia menu for Friday pickup in Rocklin, California.",
  instagram: {
    label: "@saltedfocaccia",
    url: "https://www.instagram.com/saltedfocaccia/",
  },
  announcement: "Friday pickup · 2–6 pm · Orders close Wednesday at midnight",
  navigation: [
    { label: "Feed me", href: "/#products" },
    { label: "Recipes", href: "/recipes" },
    { label: "Pickup info", href: "/pickup" },
    { label: "Special orders", href: "/special-orders" },
    { label: "About", href: "/about" },
  ],
  hero: {
    eyebrow: "Sourdough focaccia + more",
    headline: "A little salty.\nA lot to love.",
    description: "Fresh-baked sourdough focaccia made for sharing. Or not.",
    image:
      "https://placehold.co/1200x1400/BB906F/FAF3E7/png?text=the+good%0Astuff.&font=lora",
    imageAlt: "Warm copper placeholder for future Salted focaccia photography",
  },
  seasonal: {
    eyebrow: "A little something seasonal",
    title: "Same slow dough.\nNew little obsession.",
    description:
      "There’s always room for something new at the table. Meet our rotating seasonal focaccia — a little surprise, baked right in.",
    note: "Seasonal flavor and availability are a preview. Final menu coming soon.",
  },
  about: {
    heading: "Good bread.\nGood company.",
    description:
      "Salted is a small bakery with a soft spot for sourdough focaccia. Bread for the middle of the table, the last bit of sauce, and the people you love feeding.",
    status: "Draft brand copy · our full story is coming soon.",
  },
  howItWorks: [
    {
      number: "01",
      title: "Pick your bread",
      description: "Choose your flavor, size, and quantity.",
    },
    {
      number: "02",
      title: "Pick your Friday",
      description: "Choose an available pickup date at checkout.",
    },
    {
      number: "03",
      title: "Pay online + pick it up",
      description: "Friday, 2–6 pm. Your weekend starts here.",
    },
  ],
} as const;
