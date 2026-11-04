import {
  defineLocations,
  type PresentationPluginOptions,
} from "sanity/presentation";

const page = (title: string, href: string) =>
  defineLocations({ locations: [{ title, href }] });
export const resolve: PresentationPluginOptions["resolve"] = {
  locations: {
    homepage: page("Homepage", "/"),
    siteSettings: page("Site settings", "/"),
    review: page("Reviews", "/"),
    pickupPage: page("Pickup", "/pickup"),
    specialOrdersPage: page("Special orders", "/special-orders"),
    aboutPage: page("About", "/about"),
    storageHeatingPage: page("Storage & reheating", "/storage-heating"),
    recipesPage: page("Recipes", "/recipes"),
    privacyPage: page("Privacy", "/privacy"),
    termsPage: page("Terms", "/terms"),
    commerceCopy: defineLocations({
      locations: [
        { title: "Storefront & cart", href: "/#products" },
        { title: "Confirmation preview", href: "/order/success" },
      ],
    }),
    product: defineLocations({
      select: { title: "internalName", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          ...(doc?.slug
            ? [{ title: doc.title || "Product", href: `/products/${doc.slug}` }]
            : []),
          { title: "Storefront", href: "/#products" },
        ],
      }),
    }),
    recipe: defineLocations({
      select: { title: "internalName", slug: "slug.current" },
      resolve: (doc) => ({
        locations: [
          ...(doc?.slug
            ? [{ title: doc.title || "Recipe", href: `/recipes/${doc.slug}` }]
            : []),
          { title: "Recipes", href: "/recipes" },
          { title: "Homepage", href: "/" },
        ],
      }),
    }),
  },
};
