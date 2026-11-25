import {
  hasProductCardContent,
  hasRecipeCardContent,
} from "@/sanity/lib/card-content";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ProductPurchase } from "@/components/commerce/product-purchase";
import { ProductUnavailable } from "@/components/commerce/product-unavailable";
import { ProductDetailLayout } from "@/components/commerce/product-images";
import { ProductSelectionProvider } from "@/components/commerce/product-selection";
import { ProductCard } from "@/components/commerce/product-card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Text } from "@/components/cms/text";
import { CmsImage } from "@/components/cms/image";
import { SectionHeading } from "@/components/content/section-heading";
import { money } from "@/lib/format";
import { fetchContent } from "@/sanity/lib/fetch-content";
import { PRODUCT_QUERY, RECIPES_QUERY } from "@/sanity/lib/queries";
import { getGlobalContent } from "@/sanity/lib/data";
import { mapProduct, mapRecipe } from "@/sanity/lib/mappers";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  getSearchProduct,
  getSearchSettings,
  isSearchDraft,
} from "@/lib/seo/content";
import { searchableProduct } from "@/lib/seo/eligibility";
import { searchText } from "@/lib/seo/fields";
import { detailPath, noIndex } from "@/lib/seo/policy";
import { pageEntities, productEntity } from "@/lib/seo/structured-data";
import { SearchStructuredData } from "@/components/cms/search-structured-data";
import {
  getPublishedPickupCatalog,
  storefrontSchedule,
} from "@/commerce/schedule";
import { hasCopy, hasImage, hasText } from "@/sanity/lib/content";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ size?: string | string[] }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [doc] = await Promise.all([
    getSearchProduct(slug),
    getSearchSettings(),
  ]);
  if (!doc || !mapProduct(doc)) return { robots: noIndex };

  const name = searchText(doc.displayName);
  const category = searchText(doc.categoryTitle);
  const breadTitle =
    category?.toLowerCase() === "sourdough" &&
    name &&
    /\bsourdough\b/i.test(name) &&
    !/\b(?:bread|loaf|loaves)\b/i.test(name)
      ? `${name} Bread`
      : undefined;
  const title =
    breadTitle ??
    (name && category && !name.toLowerCase().includes(category.toLowerCase())
      ? `${name} ${category}`
      : (name ?? "Bread Menu Item"));
  const short = searchText(doc.shortDescription) ?? searchText(doc.description);
  return pageMetadata({
    path: detailPath("products", slug),
    eligible: searchableProduct(doc),
    seo: doc.seo,
    title,
    description:
      short && doc.active
        ? `${short} See sizes and Friday pickup options.`
        : short,
    fallbackDescription: `See details for ${title} from Salted Focaccia’s Rocklin pickup menu.`,
    image: doc.image,
  });
}

async function ProductStructuredData({ slug }: { slug: string }) {
  const [draft, doc, settings] = await Promise.all([
    isSearchDraft(),
    getSearchProduct(slug),
    getSearchSettings(),
  ]);
  if (
    draft ||
    !doc ||
    !searchableProduct(doc) ||
    settings?.seo?.noIndex === true
  )
    return null;
  const product = mapProduct(doc);
  if (!product) return null;
  const [schedule, catalog] = product.active
    ? await Promise.all([
        storefrontSchedule(),
        getPublishedPickupCatalog().catch(() => undefined),
      ])
    : [];
  const path = detailPath("products", slug);
  const entity = productEntity(
    path,
    product,
    searchText(doc.categoryTitle),
    schedule,
    catalog,
  );
  if (!entity) return null;
  return (
    <SearchStructuredData
      nodes={[
        ...pageEntities(path, entity.name, "WebPage", { "@id": entity["@id"] }),
        entity,
      ]}
    />
  );
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { size }] = await Promise.all([params, searchParams]);
  const [doc, recipeDocs, { commerce, products }] = await Promise.all([
    fetchContent(PRODUCT_QUERY, { slug }),
    fetchContent(RECIPES_QUERY),
    getGlobalContent(),
  ]);
  const product = doc ? mapProduct(doc) : null;
  if (!product) notFound();
  const c = commerce?.product;
  const activeVariants = product.variants.filter(
    (option) => option.active !== false,
  );
  const selectedSize =
    product.active && typeof size === "string"
      ? activeVariants.find((option) => option.id === size)
      : undefined;
  const relatedRecipes = (recipeDocs ?? [])
    .filter((recipe) => product.relatedRecipeIds.includes(recipe._id))
    .map(mapRecipe)
    .filter(hasRecipeCardContent);
  const relatedProducts = products.filter(
    (other) =>
      product.relatedProductIds.includes(other._id) &&
      hasProductCardContent(other),
  );
  const food =
    product.ingredients.length ||
    product.allergens.length ||
    product.dietaryLabels.length;
  const storage =
    hasText(product.storageSummary) ||
    hasText(product.reheatingSummary) ||
    hasText(c?.storageBody) ||
    hasText(c?.storageCta);
  const pickup = hasText(c?.pickupBody) || hasText(c?.pickupCta);
  const showStorage = storage && hasText(c?.storageHeading);
  const showPickup = pickup && hasText(c?.pickupHeading);
  const gallery = product.gallery?.filter(hasImage) ?? [];
  const copy =
    [
      product.name,
      product.badge,
      product.shortDescription,
      product.description,
    ].some(hasText) ||
    product.variants.length ||
    (!product.active && hasCopy(commerce?.inactiveProduct)) ||
    food ||
    showStorage ||
    showPickup;
  return (
    <div className="shell">
      <ProductStructuredData slug={slug} />
      {hasText(c?.back) ? (
        <Link href="/#products" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          {c.back}
        </Link>
      ) : null}
      <ProductSelectionProvider
        product={product}
        initialVariantId={selectedSize?.id}
        key={selectedSize?.id}
      >
        <ProductDetailLayout>
          {copy ? (
            <div className="product-detail-copy">
              {hasText(product.eyebrow) || hasText(product.badge) ? (
                <p className="eyebrow">
                  {product.eyebrow}
                  {hasText(product.eyebrow) && hasText(product.badge)
                    ? " · "
                    : null}
                  {product.badge}
                </p>
              ) : null}
              <Text as="h1" value={product.name} />
              {activeVariants[0] ? (
                <p className="detail-price">
                  {!selectedSize &&
                  activeVariants.length > 1 &&
                  hasText(c?.from) ? (
                    <>{c.from} </>
                  ) : null}
                  {money((selectedSize ?? activeVariants[0]).price)}
                </p>
              ) : null}
              <Text
                className="text-lg leading-relaxed"
                value={product.shortDescription}
              />
              <Text
                className="mt-4 text-sm leading-relaxed text-muted-foreground"
                value={product.description}
              />
              <Text value={product.servingDescription} />
              {product.active ? (
                <ProductPurchase detailed />
              ) : (
                <ProductUnavailable copy={commerce?.inactiveProduct} />
              )}
              {(food && hasText(c?.foodSummary)) ||
              showStorage ||
              showPickup ? (
                <div className="product-information">
                  {food && hasText(c?.foodSummary) ? (
                    <details>
                      <summary>{c.foodSummary}</summary>
                      <div className="detail-content">
                        <Text
                          className="draft-pill mb-3"
                          value={c.approvalNote}
                        />
                        {product.ingredients.length ? (
                          <>
                            <Text as="h2" value={c.ingredients} />
                            <ul>
                              {product.ingredients.map((ingredient, i) => (
                                <li key={i}>{ingredient}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {product.allergens.length ? (
                          <>
                            <Text as="h2" value={c.allergens} />
                            <ul>
                              {product.allergens.map((allergen, i) => (
                                <li key={i}>{allergen}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {product.dietaryLabels.length ? (
                          <p>{product.dietaryLabels.join(" · ")}</p>
                        ) : (
                          <Text className="mt-3" value={c.dietaryPending} />
                        )}
                      </div>
                    </details>
                  ) : null}
                  {showStorage ? (
                    <details>
                      <summary>{c?.storageHeading}</summary>
                      <div className="detail-content">
                        <Text value={product.storageSummary} />
                        <Text value={product.reheatingSummary} />
                        <Text value={c?.storageBody} />
                        {hasText(c?.storageCta) ? (
                          <Link
                            href="/storage-heating"
                            className="inline-link mt-4"
                          >
                            {c?.storageCta}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </Link>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                  {showPickup ? (
                    <details>
                      <summary>{c?.pickupHeading}</summary>
                      <div className="detail-content">
                        <Text value={c?.pickupBody} />
                        {hasText(c?.pickupCta) ? (
                          <Link href="/pickup" className="inline-link mt-4">
                            {c?.pickupCta}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </Link>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </ProductDetailLayout>
      </ProductSelectionProvider>
      {gallery.length ? (
        <div className="recipe-grid py-8">
          {gallery.map((image) => (
            <figure key={image._key}>
              <div className="relative aspect-square">
                <CmsImage
                  image={image}
                  aspectRatio={1}
                  documentType={product._type}
                  documentId={product._id}
                  path={`gallery[_key=="${image._key}"]`}
                  sizes="(max-width: 639px) 100vw, 33vw"
                />
              </div>
              <Text as="figcaption" value={image.caption} />
            </figure>
          ))}
        </div>
      ) : null}
      {/* {relatedRecipes.length ? (
        <section className="section-pad">
          <SectionHeading
            eyebrow={c?.recipesEyebrow}
            heading={c?.recipesHeading}
            action={
              hasText(commerce?.recipe?.allRecipes) ? (
                <Link className="inline-link" href="/recipes">
                  {commerce.recipe.allRecipes}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ) : null
            }
          />
          <div className="recipe-grid">
            {relatedRecipes.map((recipe) => (
              <RecipeCard
                recipe={recipe}
                key={recipe.id}
                copy={commerce?.recipe}
              />
            ))}
          </div>
        </section>
      ) : null} */}
      {relatedProducts.length ? (
        <section className="section-pad border-t border-border">
          <SectionHeading
            eyebrow={c?.relatedEyebrow}
            heading={c?.relatedHeading}
          />
          <div className="product-grid">
            {relatedProducts.map((other) => (
              <ProductCard product={other} key={other.id} copy={c} variant="storefront" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
