import type {
  PickupPage,
  SEARCH_SETTINGS_QUERY_RESULT,
} from "../../../sanity.types";
import type { MockSchedule, Product, Recipe } from "@/types/content";
import type { Catalog } from "@/commerce/catalog";
import { nextMenuPickup } from "@/lib/availability";
import { getProductImage } from "@/lib/product-image";
import { searchImage, searchText } from "./fields";
import { canonicalUrl, siteName } from "./policy";

const context = "https://schema.org";
const businessId = canonicalUrl("/#business");
const websiteId = canonicalUrl("/#website");
const business = { "@id": businessId };
const website = { "@id": websiteId };
const businessDescription =
  "Small-batch, homemade sourdough focaccia and more.";

export function serializeStructuredData(graph: readonly object[]) {
  return JSON.stringify({ "@context": context, "@graph": graph }).replace(
    /</g,
    "\\u003c",
  );
}

function publicSocialProfile(value: string | undefined) {
  try {
    const url = new URL(searchText(value) ?? "");
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function businessEntities(
  settings: SEARCH_SETTINGS_QUERY_RESULT,
  pickup: PickupPage | null,
) {
  const details = settings?.searchBusiness;
  const publicAddress = details?.publicAddress;
  const pickupPlace = searchText(pickup?.where?.heading);
  const locality =
    searchText(details?.pickupCity) ??
    (pickupPlace === "Rocklin, California" ? "Rocklin" : undefined);
  const region =
    searchText(details?.state) ??
    (pickupPlace === "Rocklin, California" ? "California" : undefined);
  const street = searchText(publicAddress?.street);
  const address =
    street &&
    locality &&
    region &&
    searchText(pickup?.where?.address)?.includes(street)
      ? {
          "@type": "PostalAddress",
          streetAddress: street,
          addressLocality: locality,
          addressRegion: region,
          postalCode: searchText(publicAddress?.postalCode),
          addressCountry: "US",
        }
      : undefined;
  const areas = [
    locality && region ? `${locality}, ${region}` : pickupPlace,
    searchText(details?.county),
    ...(details?.nearbyCommunities ?? []).map(searchText),
  ].filter((value): value is string => Boolean(value));
  const sameAs = [
    settings?.contact?.instagramUrl,
    ...(details?.socialProfiles ?? []),
  ]
    .map(publicSocialProfile)
    .filter((value): value is string => Boolean(value));
  const publicEmail = searchText(settings?.contact?.email);
  const telephone = searchText(details?.telephone);
  const logo =
    searchImage(details?.logo, 600, 600)?.url ??
    canonicalUrl("/images/brand/hero-wordmark.png");
  const entity = {
    "@type": address ? ("Bakery" as const) : ("Organization" as const),
    "@id": businessId,
    name: searchText(settings?.brand?.businessName) ?? siteName,
    url: canonicalUrl("/"),
    description: searchText(details?.description) ?? businessDescription,
    logo,
    image: searchImage(settings?.seo?.image)?.url,
    address,
    areaServed: areas.length ? Array.from(new Set(areas)) : undefined,
    sameAs: sameAs.length ? Array.from(new Set(sameAs)) : undefined,
    telephone:
      telephone && /^[+\d().\s-]{7,25}$/.test(telephone)
        ? telephone
        : undefined,
    email:
      publicEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)
        ? publicEmail
        : undefined,
  };
  return [
    entity,
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: siteName,
      alternateName: "Salted",
      url: canonicalUrl("/"),
      inLanguage: "en-US",
      publisher: business,
    },
  ] as const;
}

type PageType = "WebPage" | "AboutPage" | "CollectionPage";

export function pageEntities(
  path: string,
  name: string,
  type: PageType = "WebPage",
  mainEntity?: { "@id": string },
  recipeDetail = false,
) {
  const url = canonicalUrl(path);
  const entries =
    path === "/"
      ? []
      : [
          { name: "Home", item: canonicalUrl("/") },
          ...(recipeDetail
            ? [{ name: "Recipes", item: canonicalUrl("/recipes") }]
            : []),
          { name, item: url },
        ];
  return [
    {
      "@type": type,
      "@id": `${url}#webpage`,
      url,
      name,
      isPartOf: website,
      publisher: business,
      mainEntity,
      inLanguage: "en-US",
      breadcrumb: entries.length ? { "@id": `${url}#breadcrumb` } : undefined,
    },
    ...(entries.length
      ? [
          {
            "@type": "BreadcrumbList",
            "@id": `${url}#breadcrumb`,
            itemListElement: entries.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              ...item,
            })),
          },
        ]
      : []),
  ];
}

export function productEntity(
  path: string,
  product: Product,
  category: string | undefined,
  schedule: MockSchedule | undefined,
  catalog: Catalog | undefined,
) {
  const url = canonicalUrl(path);
  const name = searchText(product.name);
  if (!name) return undefined;
  const image = searchImage(product.image, 1200, 1500)?.url;
  const nextPickup = schedule ? nextMenuPickup(schedule) : undefined;
  const offerings = schedule?.recurring?.offerings ?? [];
  const published = catalog?.find((entry) => entry.id === product.id);
  const base = {
    name,
    url,
    image,
    description:
      searchText(product.shortDescription) ?? searchText(product.description),
    brand: { "@type": "Brand", name: "Salted" },
    category,
  };
  const variants = product.variants.filter(
    (variant) =>
      variant.active !== false &&
      /^[a-z0-9-]+$/.test(variant.id) &&
      searchText(variant.label) &&
      product.variants.filter(({ id }) => id === variant.id).length === 1,
  );
  const offer = (variant: Product["variants"][number], variantUrl: string) => {
    if (
      !product.active ||
      !nextPickup ||
      !published?.active ||
      !offerings.some(
        (entry) =>
          entry.productId === product.id && entry.variantId === variant.id,
      ) ||
      published.variants?.find((entry) => entry.id === variant.id)?.price !==
        variant.price
    ) {
      return undefined;
    }
    return {
      "@type": "Offer",
      url: variantUrl,
      price: (variant.price / 100).toFixed(2),
      priceCurrency: "USD",
      availability: `${context}/InStock`,
      seller: business,
    };
  };
  if (!product.active || variants.length < 2) {
    const variant = variants[0];
    return {
      "@type": "Product" as const,
      "@id": `${url}#product`,
      ...base,
      sku: variant ? `${product.id}:${variant.id}` : product.id,
      size:
        product.active && variant ? searchText(variant.shortLabel) : undefined,
      offers: variant ? offer(variant, url) : undefined,
    };
  }
  return {
    "@type": "ProductGroup" as const,
    "@id": `${url}#product`,
    ...base,
    productGroupID: product.id,
    variesBy: `${context}/size`,
    hasVariant: variants.map((variant) => {
      const variantUrl = new URL(url);
      variantUrl.searchParams.set("size", variant.id);
      const variantImage = searchImage(
        getProductImage(product, variant).image,
        1200,
        1500,
      )?.url;
      return {
        "@type": "Product",
        "@id": `${variantUrl.href}#product`,
        ...base,
        url: variantUrl.href,
        name: `${name} – ${searchText(variant.shortLabel) ?? searchText(variant.label)}`,
        image: variantImage,
        sku: `${product.id}:${variant.id}`,
        size: searchText(variant.shortLabel) ?? searchText(variant.label),
        offers: offer(variant, variantUrl.href),
      };
    }),
  };
}

function duration(minutes: number | undefined) {
  return Number.isSafeInteger(minutes) &&
    typeof minutes === "number" &&
    minutes >= 0
    ? `PT${minutes}M`
    : undefined;
}

export function recipeEntity(path: string, recipe: Recipe) {
  if (recipe.recipeMarkupApproved !== true) return undefined;
  const name = searchText(recipe.title);
  const image = searchImage(recipe.image, 1200, 675);
  const ingredients = recipe.ingredientGroups
    ?.flatMap((group) => group.ingredients ?? [])
    .map(searchText)
    .filter((item): item is string => Boolean(item));
  const steps = recipe.steps?.flatMap((step) => {
    const text = searchText(step.body);
    return text
      ? [
          {
            "@type": "HowToStep",
            name: searchText(step.heading),
            text,
          },
        ]
      : [];
  });
  if (!name || !image || !ingredients?.length || !steps?.length)
    return undefined;
  const url = canonicalUrl(path);
  const author = searchText(recipe.author);
  const publishedOn = searchText(recipe.publishedOn);
  return {
    "@type": "Recipe" as const,
    "@id": `${url}#recipe`,
    name,
    url,
    image: image.url,
    author: author
      ? {
          "@type": author === siteName ? "Organization" : "Person",
          name: author,
        }
      : undefined,
    description: searchText(recipe.description),
    datePublished:
      publishedOn && /^\d{4}-\d{2}-\d{2}$/.test(publishedOn)
        ? publishedOn
        : undefined,
    dateModified: recipe._updatedAt,
    prepTime: duration(recipe.prepMinutes),
    cookTime: duration(recipe.cookMinutes),
    totalTime: duration(recipe.totalMinutes),
    recipeYield: searchText(recipe.servings),
    recipeIngredient: ingredients,
    recipeInstructions: steps,
    recipeCategory: searchText(recipe.recipeCategory),
    recipeCuisine: searchText(recipe.recipeCuisine),
    publisher: business,
  };
}
