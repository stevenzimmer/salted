import { defineQuery } from "next-sanity";

export const GLOBAL_QUERY = defineQuery(`{
  "settings": *[_type == "siteSettings" && _id == "siteSettings"][0],
  "commerce": *[_type == "commerceCopy" && _id == "commerceCopy"][0],
  "products": *[_type == "product" && active == true] | order(displayOrder asc, _id asc)
}`);
export const HOME_QUERY = defineQuery(`{
  "page": *[_type == "homepage" && _id == "homepage"][0]{..., "recipes": featuredRecipes[]->, "reviews": featuredReviews[]->}
}`);
export const RECIPES_QUERY = defineQuery(
  `*[_type == "recipe" && active == true] | order(displayOrder asc, _id asc)`,
);
export const RECIPE_QUERY = defineQuery(
  `*[_type == "recipe" && active == true && slug.current == $slug][0]`,
);
export const PRODUCT_QUERY = defineQuery(
  `*[_type == "product" && slug.current == $slug][0]`,
);
export const ABOUT_QUERY = defineQuery(
  `*[_type == "aboutPage" && _id == "aboutPage"][0]`,
);
export const PICKUP_QUERY = defineQuery(
  `*[_type == "pickupPage" && _id == "pickupPage"][0]`,
);
export const SPECIAL_ORDERS_QUERY = defineQuery(
  `*[_type == "specialOrdersPage" && _id == "specialOrdersPage"][0]`,
);
export const STORAGE_QUERY = defineQuery(
  `*[_type == "storageHeatingPage" && _id == "storageHeatingPage"][0]`,
);
export const RECIPES_PAGE_QUERY = defineQuery(
  `*[_type == "recipesPage" && _id == "recipesPage"][0]`,
);
export const PRIVACY_QUERY = defineQuery(
  `*[_type == "privacyPage" && _id == "privacyPage"][0]`,
);
export const TERMS_QUERY = defineQuery(
  `*[_type == "termsPage" && _id == "termsPage"][0]`,
);

// Commerce always executes these against published documents without CDN/cache.
export const COMMERCE_CATALOG_QUERY = defineQuery(
  `*[_type == "product"]{_id, id, active, displayName, variants[]{id, active, label, price}}`,
);
export const MARKETING_CONSENT_QUERY = defineQuery(
  `*[_type == "commerceCopy" && _id == "commerceCopy"][0].marketingConsent.label`,
);
export const PICKUP_BLACKOUT_DATES_QUERY = defineQuery(
  `*[_type == "pickupPage" && _id == "pickupPage"][0].blackoutDates`,
);
