import assert from "node:assert/strict";
import test from "node:test";
import type { ImageWithAlt } from "../sanity.types";
import {
  homeShareCard,
  productShareCard,
  productShareImagePath,
  shareCardMetadata,
} from "../src/lib/og/cards";
import { products } from "./fixtures/catalog";

const primaryPhoto: ImageWithAlt = {
  _type: "imageWithAlt",
  asset: { _type: "reference", _ref: "image-primary-1200x1500-jpg" },
  alt: "Slices of focaccia",
};
const additionalPhoto = {
  ...primaryPhoto,
  _key: "other",
  alt: "A loaf on a board",
};

test("the homepage uses the lead photo, then the first valid additional photo", () => {
  const heroPhotos = [
    { ...primaryPhoto, _key: "invalid", alt: " " },
    additionalPhoto,
  ];
  assert.equal(
    homeShareCard({ heroImage: primaryPhoto, heroPhotos }).photo,
    primaryPhoto,
  );
  assert.equal(homeShareCard({ heroPhotos }).photo, additionalPhoto);
  assert.deepEqual(homeShareCard({}), {
    kind: "home",
    eyebrow: "",
    tagline: "",
    photo: undefined,
  });
});

test("the homepage eyebrow adds the hero caption and location alongside the tagline", () => {
  const hero = {
    caption: "Bakery caption",
    location: "Rocklin, CA",
    eyebrow: "Hero tagline",
  };
  const card = homeShareCard({ hero });
  assert.equal(card.eyebrow, "Bakery caption · Rocklin, CA");
  assert.equal(
    homeShareCard({ hero: { location: hero.location } }).eyebrow,
    "Rocklin, CA",
  );
  assert.equal(
    homeShareCard({ hero: { caption: hero.caption, location: " " } }).eyebrow,
    "Bakery caption",
  );
  assert.deepEqual(shareCardMetadata("/api/og/home", card).openGraph?.images, [
    {
      url: "/api/og/home",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "Salted · Bakery caption · Rocklin, CA · Hero tagline",
    },
  ]);
});

test("product cards use the primary photo, the category tint, and the lowest active size price", () => {
  const product = {
    ...products[0],
    active: true,
    category: "product-category-sourdough",
    image: primaryPhoto,
    variants: products[0].variants.slice(0, 3).map((variant, index) => ({
      ...variant,
      active: index !== 1,
      price: [2500, 700, 1250][index],
      image: additionalPhoto,
    })),
  };
  const card = productShareCard(product, "From");
  assert.equal(card.kind, "product");
  assert.equal(card.price, "From $12.50");
  assert.equal(card.photo, primaryPhoto);
  assert.equal(card.background, "oat");
  assert.equal(productShareCard(product, " ").price, "$12.50");
  assert.equal(
    productShareCard({ ...product, active: false }).price,
    undefined,
  );
  assert.equal(productShareCard({ ...product, variants: [] }).price, undefined);
  assert.equal(
    productShareCard({ ...product, image: undefined }).photo,
    undefined,
  );
  assert.equal(
    productShareCard({ ...product, category: "other" }).background,
    "cream",
  );
});

test("share metadata describes the image and uses the same PNG for Open Graph and Twitter", () => {
  const product = {
    ...products[0],
    name: "Focaccia",
    shortDescription: "Rosemary and sea salt",
    image: primaryPhoto,
  };
  const { openGraph, twitter } = shareCardMetadata(
    productShareImagePath("rosemary & salt"),
    productShareCard(product),
  );
  assert.deepEqual(openGraph?.images, [
    {
      url: "/api/og/products/rosemary%20%26%20salt",
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "Salted · Focaccia · Rosemary and sea salt · Slices of focaccia",
    },
  ]);
  assert.deepEqual(twitter, {
    card: "summary_large_image",
    images: openGraph.images,
  });
});
