import type { CmsPortableText } from "@/sanity/lib/content";
import type {
  ImageWithAlt,
  Product as CmsProduct,
  Recipe as CmsRecipe,
} from "../../sanity.types";

export type ProductVariant = {
  _key: string;
  id: string;
  label: string;
  shortLabel: string;
  servingDescription: string;
  price: number;
  active?: boolean;
  image?: ImageWithAlt;
};
export type Product = Omit<
  CmsProduct,
  "slug" | "variants" | "category" | "tier"
> & {
  id: string;
  name: string;
  slug: string;
  category: string;
  tier: "classic" | "specialty";
  shortDescription: string;
  description: string;
  image?: ImageWithAlt;
  ingredients: string[];
  allergens: string[];
  dietaryLabels: string[];
  variants: ProductVariant[];
  relatedRecipeIds: string[];
  relatedProductIds: string[];
  active: boolean;
};
export type Recipe = Omit<
  CmsRecipe,
  "slug" | "tags" | "introduction" | "notes"
> & {
  introduction?: CmsPortableText;
  notes?: CmsPortableText;
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  relatedProductIds: string[];
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
  inventory: number | null; // null explicitly means uncapped, never missing stock.
};

export type MockSchedule = {
  dates: PickupDate[];
  availability: ProductAvailability[];
};
