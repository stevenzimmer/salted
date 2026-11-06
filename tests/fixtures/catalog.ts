import type { Product } from "../../src/types/content";
function product(id: string, name: string, prices: number[]): Product {
  return {
    _id: `product-${id}`,
    _type: "product",
    _createdAt: "",
    _updatedAt: "",
    _rev: "",
    internalName: "Test fixture",
    id,
    name,
    slug: id,
    category: "focaccia",
    tier: "specialty",
    active: true,
    shortDescription: "",
    description: "",
    ingredients: [],
    allergens: [],
    dietaryLabels: [],
    relatedRecipeIds: [],
    relatedProductIds: [],
    variants: ["round", "square", "pan"].map((id, i) => ({
      _key: id,
      id,
      label: id,
      shortLabel: id,
      servingDescription: "",
      price: prices[i],
    })),
  };
}
export const products = [
  product("pesto-mozzarella", "Pesto Mozzarella", [800, 1500, 2200]),
  product("parmesan-chili-crisp", "Parmesan Chili Crisp", [800, 1500, 2200]),
  product("classic-focaccia", "Classic Focaccia", [700, 1300, 1900]),
];
