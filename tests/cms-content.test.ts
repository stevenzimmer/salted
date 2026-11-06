import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stegaEncodeSourceMap } from "@sanity/client/stega";
import {
  hasText,
  hasPortableTextContent,
  hasImage,
  hasCopy,
  clean,
  visibleBlocks,
  safeUrl,
} from "../src/sanity/lib/content";
import { Text } from "../src/components/cms/text";
import { PageIntro } from "../src/components/content/page-intro";
import { RichText } from "../src/components/cms/rich-text";
import { Hero } from "../src/components/home/hero";
import { imageAnnotation } from "../src/components/cms/image";
import { AnnouncementBar } from "../src/components/layout/announcement-bar";
import { mapProduct } from "../src/sanity/lib/mappers";
import { hasProductCardContent } from "../src/sanity/lib/card-content";
import { normalizeCart, resolveCart } from "../src/lib/cart";
import { products } from "./fixtures/catalog";
import type {
  Homepage,
  ImageWithAlt,
  PortableText,
  SiteSettings,
} from "../sanity.types";

function encoded(value: string) {
  return stegaEncodeSourceMap(
    { value },
    {
      documents: [{ _id: "homepage", _type: "homepage" }],
      paths: ["$['hero']['headline']"],
      mappings: {
        "$['value']": {
          type: "value",
          source: { type: "documentValue", document: 0, path: 0 },
        },
      },
    },
    { enabled: true, studioUrl: "/studio", filter: () => true },
  ).value;
}
function page(hero: Homepage["hero"] = {}): Homepage {
  return {
    _type: "homepage",
    _id: "homepage",
    _rev: "",
    _createdAt: "",
    _updatedAt: "",
    internalName: "Home",
    hero,
  };
}
function settings(): SiteSettings {
  return {
    _type: "siteSettings",
    _id: "siteSettings",
    _rev: "",
    _createdAt: "",
    _updatedAt: "",
    internalName: "Settings",
  };
}
const image: ImageWithAlt = {
  _type: "imageWithAlt",
  asset: { _type: "reference", _ref: "image-abc123-800x1000-png" },
  alt: "Focaccia",
};
test("image annotations contain the document type and field path", () => {
  assert.ok(
    imageAnnotation("product-classic-focaccia", "image", "product").includes(
      "product",
    ),
  );
});
function block(text: string): PortableText[number] {
  return {
    _type: "block",
    _key: "block",
    style: "normal",
    children: [{ _type: "span", _key: "span", text, marks: [] }],
  };
}

test("presence tests ignore real Sanity source-map encoding, whitespace, null and missing text", () => {
  for (const value of [
    undefined,
    null,
    "",
    " \n\t ",
    encoded(""),
    encoded("   "),
  ]) {
    assert.equal(hasText(value), false);
    assert.equal(
      renderToStaticMarkup(createElement(Text, { as: "h2", value })),
      "",
    );
  }
  const title = encoded("Good bread");
  assert.notEqual(title, "Good bread");
  assert.equal(clean(title), "Good bread");
  assert.equal(hasText(title), true);
  assert.ok(
    renderToStaticMarkup(
      createElement(Text, { as: "h2", value: title }),
    ).includes(title),
  );
});
test("empty CTA removes the entire control including its icon", () => {
  assert.equal(
    renderToStaticMarkup(
      createElement(
        Text,
        { as: "a", href: "/#products", value: encoded(" ") },
        createElement("span", null, "→"),
      ),
    ),
    "",
  );
});
test("page intro removes individual fields and the entire empty header", () => {
  assert.equal(
    renderToStaticMarkup(
      createElement(PageIntro, {
        eyebrow: encoded(" "),
        title: encoded(""),
        description: null,
      }),
    ),
    "",
  );
  const html = renderToStaticMarkup(
    createElement(PageIntro, {
      eyebrow: encoded(""),
      title: encoded("Heading"),
      description: " ",
    }),
  );
  assert.match(html, /<h1>/);
  assert.doesNotMatch(html, /<p/);
});
test("Portable Text with only empty encoded blocks creates no wrapper; empty blocks in mixed content disappear", () => {
  assert.equal(hasPortableTextContent([block(encoded(" "))]), false);
  assert.equal(
    renderToStaticMarkup(
      createElement(RichText, {
        value: [block(encoded(""))],
        className: "legal-content",
      }),
    ),
    "",
  );
  const mixed = [
    block(encoded(" ")),
    { ...block(encoded("Useful paragraph")), _key: "second" },
  ];
  assert.equal(visibleBlocks(mixed).length, 1);
  const html = renderToStaticMarkup(createElement(RichText, { value: mixed }));
  assert.equal((html.match(/<p>/g) || []).length, 1);
});
test("missing assets and missing meaningful alt text do not leave image wrappers", () => {
  assert.equal(hasImage(undefined), false);
  assert.equal(hasImage({ ...image, asset: undefined }), false);
  assert.equal(hasImage({ ...image, alt: encoded(" ") }), false);
  assert.equal(hasImage({ ...image, alt: undefined, decorative: true }), true);
  assert.equal(hasImage(image), true);
  const html = renderToStaticMarkup(
    createElement(Hero, {
      page: page({ headline: "Only copy" }),
      settings: null,
    }),
  );
  assert.doesNotMatch(html, /hero-visual|<img/);
  assert.match(html, /cms-single-column/);
});
test("an entirely cleared hero and announcement have no section, padding, or ornaments", () => {
  assert.equal(
    renderToStaticMarkup(
      createElement(Hero, {
        page: page({ headline: encoded(" "), cta: encoded("") }),
        settings: null,
      }),
    ),
    "",
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(AnnouncementBar, {
        settings: {
          ...settings(),
          announcementEnabled: true,
          announcement: { text: encoded(" ") },
        },
      }),
    ),
    "",
  );
  assert.equal(
    hasCopy({ _type: "object", heading: encoded(" "), enabled: true }),
    false,
  );
});
test("empty variant labels are removed; valid labels and integer cent prices are preserved", () => {
  const fixture = products[0];
  const mapped = mapProduct({
    ...fixture,
    slug: { _type: "slug", current: fixture.slug },
    category: { _type: "reference", _ref: "product-category-focaccia" },
    tier: "specialty",
    variants: [
      {
        _key: "one",
        _type: "productVariant",
        id: "round",
        label: encoded(" "),
        price: 800,
        active: true,
      },
      {
        _key: "two",
        _type: "productVariant",
        id: "square",
        label: encoded("Square"),
        image: {
          ...image,
          alt: encoded("Square focaccia"),
          crop: {
            _type: "sanity.imageCrop",
            top: 0.1,
            bottom: 0.1,
            left: 0,
            right: 0,
          },
        },
        price: 1500,
        active: true,
      },
      {
        _key: "three",
        _type: "productVariant",
        id: "pan",
        label: "Pan",
        price: 2200.5,
        active: true,
      },
    ],
  });
  assert.equal(mapped?.variants.length, 1);
  assert.equal(mapped?.variants[0].id, "square");
  assert.equal(mapped?.variants[0].price, 1500);
  assert.ok(mapped?.variants[0].label.includes(encoded("Square")));
  assert.equal(mapped?.variants[0]._key, "two");
  assert.equal(mapped?.variants[0].image?.alt, encoded("Square focaccia"));
  assert.equal(mapped?.variants[0].image?.crop?.top, 0.1);
});
test("catalog changes remove unavailable/deleted identities from resolved persisted carts", () => {
  const items = [
    { productId: products[0].id, variantId: "square", quantity: 2 },
  ];
  assert.equal(resolveCart(items, products).length, 1);
  assert.deepEqual(resolveCart(items, []), []);
  assert.deepEqual(normalizeCart(items, []), []);
  assert.equal(normalizeCart(items)[0].quantity, 2); // Storage validates shape independently of a live catalog.
});
test("clearing all public card content removes the item before grid wrappers are built", () => {
  assert.equal(
    hasProductCardContent({
      ...products[0],
      name: encoded(" "),
      shortDescription: encoded(""),
      badge: " ",
      image: undefined,
      variants: [],
    }),
    false,
  );
  assert.equal(hasProductCardContent(products[0]), true);
});
test("external URLs are cleaned and unsafe schemes are rejected", () => {
  assert.equal(
    safeUrl(encoded("https://www.instagram.com/saltedfocaccia/")),
    "https://www.instagram.com/saltedfocaccia/",
  );
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com",
    "/\\example.com",
  ])
    assert.equal(safeUrl(url), undefined);
});

test("new and revised category references do not reject products or change inventory identities", () => {
  const fixture = products[0];
  const doc = {
    ...fixture,
    slug: { _type: "slug" as const, current: fixture.slug },
    category: { _type: "reference" as const, _ref: "editor-created-pastries" },
    variants: [],
  };
  const mapped = mapProduct(doc);
  assert.equal(mapped?.category, "editor-created-pastries");
  assert.equal(mapped?.id, fixture.id);
  assert.equal(
    mapProduct({ ...doc, category: { ...doc.category, _ref: "" } }),
    null,
  );
});
