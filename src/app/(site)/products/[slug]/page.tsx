import {
  hasProductCardContent,
  hasRecipeCardContent,
} from "@/sanity/lib/card-content";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ProductPurchase } from "@/components/commerce/product-purchase";
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
import { contentMetadata } from "@/sanity/lib/metadata";
import { hasImage, hasText } from "@/sanity/lib/content";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await fetchContent(PRODUCT_QUERY, { slug });
  return contentMetadata(
    {
      ...product?.seo,
      title: product?.seo?.title ?? product?.displayName,
      description: product?.seo?.description ?? product?.shortDescription,
    },
    `/products/${encodeURIComponent(slug)}`,
  );
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [doc, recipeDocs, { commerce, products }] = await Promise.all([
    fetchContent(PRODUCT_QUERY, { slug }),
    fetchContent(RECIPES_QUERY),
    getGlobalContent(),
  ]);
  const product = doc ? mapProduct(doc) : null;
  if (!product) notFound();
  const c = commerce?.product;
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
  const gallery = product.gallery?.filter(hasImage) ?? [];
  const copy =
    [
      product.name,
      product.badge,
      product.shortDescription,
      product.description,
    ].some(hasText) ||
    product.variants.length ||
    food ||
    (hasText(c?.storageHeading) && storage) ||
    (hasText(c?.pickupHeading) && pickup);
  return (
    <div className="shell">
      {hasText(c?.back) ? (
        <Link href="/#products" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          {c.back}
        </Link>
      ) : null}
      <ProductSelectionProvider product={product}>
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
              {product.variants[0] ? (
                <p className="detail-price">
                  {product.variants.length > 1 && hasText(c?.from) ? (
                    <>{c.from} </>
                  ) : null}
                  {money(product.variants[0].price)}
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
              <ProductPurchase detailed />
              {(food && hasText(c?.foodSummary)) ||
              (storage && hasText(c?.storageHeading)) ||
              (pickup && hasText(c?.pickupHeading)) ? (
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
                  {storage && hasText(c?.storageHeading) ? (
                    <details>
                      <summary>{c.storageHeading}</summary>
                      <div className="detail-content">
                        <Text value={product.storageSummary} />
                        <Text value={product.reheatingSummary} />
                        <Text value={c.storageBody} />
                        {hasText(c.storageCta) ? (
                          <Link
                            href="/storage-heating"
                            className="inline-link mt-4"
                          >
                            {c.storageCta}
                            <ArrowUpRight size={15} />
                          </Link>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                  {pickup && hasText(c?.pickupHeading) ? (
                    <details>
                      <summary>{c.pickupHeading}</summary>
                      <div className="detail-content">
                        <Text value={c.pickupBody} />
                        {hasText(c.pickupCta) ? (
                          <Link href="/pickup" className="inline-link mt-4">
                            {c.pickupCta}
                            <ArrowUpRight size={15} />
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
      {relatedRecipes.length ? (
        <section className="section-pad">
          <SectionHeading
            eyebrow={c?.recipesEyebrow}
            heading={c?.recipesHeading}
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
      ) : null}
      {relatedProducts.length ? (
        <section className="section-pad border-t border-border">
          <SectionHeading
            eyebrow={c?.relatedEyebrow}
            heading={c?.relatedHeading}
          />
          <div className="related-product-grid">
            {relatedProducts.map((other) => (
              <ProductCard product={other} key={other.id} copy={c} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
