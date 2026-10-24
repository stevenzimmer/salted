export type ProductVariant = {
  id: string;
  label: string;
  shortLabel: string;
  servingDescription: string;
  price: number; // Integer US cents.
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: "focaccia" | "sourdough";
  tier: "classic" | "specialty";
  shortDescription: string;
  description: string;
  image: string;
  imageAlt: string;
  ingredients: string[];
  allergens: string[];
  dietaryLabels: string[];
  contentStatus: "draft";
  variants: ProductVariant[];
  relatedRecipeIds: string[];
  active: boolean;
  badge?: string;
};

export type Recipe = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  imageAlt: string;
  ingredients: string[];
  instructions: string[];
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: string;
  tags: string[];
  relatedProductIds: string[];
  contentStatus: "draft";
};

export type CartItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type PickupDate = {
  id: string;
  date: string; // ISO calendar date in America/Los_Angeles.
  pickupStart: string;
  pickupEnd: string;
  orderCutoff: string; // ISO instant with explicit Pacific UTC offset.
  enabled: boolean;
};

export type ProductAvailability = {
  pickupDateId: string;
  productId: string;
  variantId: string;
  inventory: number;
};

export type MockSchedule = {
  dates: PickupDate[];
  availability: ProductAvailability[];
};
