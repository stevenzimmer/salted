export type InstagramPhoto = {
  id: string;
  image: string;
  alt: string;
  permalink: string;
};

export const instagramContent = {
  eyebrow: "A little slice of salted",
  heading: "Fresh from the oven.\nAnd the feed.",
  description:
    "A few favorites from our Instagram. A little bread inspiration for your scroll.",
} as const;

// Curated from @saltedfocaccia's public Instagram profile on October 30, 2026.
// Local copies avoid expiring Instagram CDN URLs and third-party tracking embeds.
// Keep each photo linked to its original post. This selection does not auto-sync.
export const instagramPhotos: readonly InstagramPhoto[] = [
  {
    id: "De2AbtYu9yk",
    image: "/images/instagram/De2AbtYu9yk.webp",
    alt: "A hand holding sliced jalapeño cheddar focaccia, showing its airy crumb and golden crust",
    permalink: "https://www.instagram.com/p/De2AbtYu9yk/",
  },
  {
    id: "Dew18OWtn0L",
    image: "/images/instagram/Dew18OWtn0L.jpg",
    alt: "Three golden focaccia rounds topped with olives on a cooling rack beside rosemary and a rust-colored cloth",
    permalink: "https://www.instagram.com/p/Dew18OWtn0L/",
  },
  {
    id: "Dew0q55BQEs",
    image: "/images/instagram/Dew0q55BQEs.jpg",
    alt: "A focaccia sandwich cut in half, with the words ‘your sandwich bread could never’ over the photograph",
    permalink: "https://www.instagram.com/reel/Dew0q55BQEs/",
  },
  {
    id: "De13PV7P0Ln",
    image: "/images/instagram/De13PV7P0Ln.webp",
    alt: "Salted’s ‘friday ritual.’ graphic in cream lettering on a lavender background",
    permalink: "https://www.instagram.com/p/De13PV7P0Ln/",
  },
];
