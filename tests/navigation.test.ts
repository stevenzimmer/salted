import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stegaEncodeSourceMap } from "@sanity/client/stega";
import type { SiteSettings } from "../sanity.types";
import {
  navigation,
  navigationHref,
  isActiveNavigationLink,
  isSamePageAnchor,
} from "../src/lib/navigation";
import { SiteFooter } from "../src/components/layout/site-footer";
import { migrateSiteNavigation } from "../scripts/migrations/navigation";
import { separateNavigation } from "../scripts/migrations/separate-navigation";

const base: SiteSettings = {
  _id: "siteSettings",
  _type: "siteSettings",
  _rev: "",
  _createdAt: "",
  _updatedAt: "",
  internalName: "Settings",
};
function item(
  label: string,
  href: string,
  key = label,
): NonNullable<SiteSettings["headerNavigation"]>[number] {
  return { _key: key, _type: "navigationItem", label, href };
}
function encoded(value: string) {
  return stegaEncodeSourceMap(
    { value },
    {
      documents: [{ _id: "siteSettings", _type: "siteSettings" }],
      paths: ["$['headerNavigation'][0]['label']"],
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

test("navigation follows CMS order and arbitrary labels/destinations", () => {
  const items = [
    item("Get in touch", "mailto:hello@example.com"),
    item("Our journal", "/recipes"),
    item("Visit Instagram", "https://www.instagram.com/saltedfocaccia/"),
  ];
  assert.deepEqual(
    navigation({ ...base, headerNavigation: items }, "headerNavigation").map(
      (link) => [link.label, link.href],
    ),
    items.map((link) => [link.label, link.href]),
  );
  const reordered = [items[2], items[0], items[1]];
  assert.deepEqual(
    navigation(
      { ...base, headerNavigation: reordered },
      "headerNavigation",
    ).map((link) => link.key),
    reordered.map((link) => link._key),
  );
});
test("the frontend caps the list at seven even for externally imported data", () => {
  const links = Array.from({ length: 9 }, (_, i) =>
    item(`Item ${i}`, `/page-${i}`),
  );
  assert.equal(
    navigation({ ...base, headerNavigation: links }, "headerNavigation").length,
    7,
  );
  assert.equal(
    navigation({ ...base, headerNavigation: links }, "headerNavigation")[6]
      .href,
    "/page-6",
  );
});
test("blank labels/links and unsafe destinations leave no rendered navigation items", () => {
  const links = [
    item(encoded(" "), "/about"),
    item("No URL", encoded("")),
    item("Unsafe", "javascript:alert(1)"),
    item(encoded("Visible"), encoded("/recipes")),
  ];
  const result = navigation(
    { ...base, headerNavigation: links },
    "headerNavigation",
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].label, links[3].label);
  assert.equal(result[0].href, "/recipes");
  assert.deepEqual(navigation(null, "headerNavigation"), []);
  assert.deepEqual(
    navigation({ ...base, headerNavigation: [] }, "headerNavigation"),
    [],
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(SiteFooter, {
        settings: { ...base, footerNavigation: links.slice(0, 3) },
      }),
    ),
    "",
  );
});
test("links accept page paths, anchors, web, email and phone destinations", () => {
  for (const href of [
    "/",
    "/recipes?tag=lunch#ideas",
    "/#products",
    "#products",
    "https://example.com/",
    "http://example.com/",
    "mailto:hello@example.com",
    "tel:+19165550100",
  ])
    assert.equal(navigationHref(href), href);
  for (const href of [
    "",
    " ",
    "#",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,x",
    "https://example.com/\npath",
    "ftp://example.com/",
    "mailto:",
  ])
    assert.equal(navigationHref(href), undefined);
});
test("active menu state follows the edited destination rather than a named menu slot", () => {
  assert.equal(isActiveNavigationLink("/about", "/about"), true);
  assert.equal(
    isActiveNavigationLink("/recipes?sort=new#top", "/recipes/example"),
    true,
  );
  assert.equal(isActiveNavigationLink("/recipes", "/recipes-extra"), false);
  assert.equal(
    isActiveNavigationLink("/#products", "/products/example"),
    false,
  );
  assert.equal(isActiveNavigationLink("https://example.com/", "/"), false);
  assert.equal(isSamePageAnchor("/#products", "/"), true);
  assert.equal(isSamePageAnchor("/about#story", "/about"), true);
  assert.equal(isSamePageAnchor("#products", "/"), true);
  assert.equal(isSamePageAnchor("/about#story", "/"), false);
});
test("footer uses CMS order and stable keys allow two menu items with the same destination", () => {
  const links = [
    item("Second", "/about", "two"),
    item("First", "/about", "one"),
  ];
  const html = renderToStaticMarkup(
    createElement(SiteFooter, {
      settings: { ...base, footerNavigation: links },
    }),
  );
  assert.ok(html.indexOf("Second") < html.indexOf("First"));
  assert.equal((html.match(/href="\/about"/g) || []).length, 2);
});
test("migration preserves published and draft labels independently and moves utility labels", () => {
  const published = {
    navigation: {
      products: "Order",
      recipes: "Read",
      pickup: "Pickup",
      specialOrders: "Gather",
      about: "Our story",
      storage: "Bread care",
      privacy: "Privacy",
      terms: "Terms",
      cart: "Bag",
    },
  };
  const draft = {
    navigation: {
      ...published.navigation,
      recipes: "Draft journal",
      about: " ",
    },
    utilityLabels: { cart: "Draft cart" },
  };
  const result = migrateSiteNavigation(published),
    draftResult = migrateSiteNavigation(draft);
  assert.deepEqual(
    result?.navigation.map((link) => link.label),
    ["Order", "Read", "Pickup", "Gather", "Our story"],
  );
  assert.deepEqual(
    result?.navigation.map((link) => link.href),
    ["/#products", "/recipes", "/pickup", "/special-orders", "/about"],
  );
  assert.equal(draftResult?.navigation[1].label, "Draft journal");
  assert.equal(draftResult?.navigation[4].label, " ");
  assert.equal(draftResult?.utilityLabels.cart, "Draft cart");
  assert.equal(result?.utilityLabels.storage, "Bread care");
  assert.equal(migrateSiteNavigation(result ?? {}), null);
  assert.equal(migrateSiteNavigation({ navigation: [] }), null);
  assert.equal(migrateSiteNavigation({}), null);
});

test("header and footer use independent lists and clearing the footer never restores header items", () => {
  const settings = {
    ...base,
    headerNavigation: [item("Header only", "/recipes")],
    footerNavigation: [
      item("Storage + reheating", "/storage-heating", "care"),
      item("Footer only", "/pickup"),
    ],
  };
  assert.deepEqual(
    navigation(settings, "headerNavigation").map((link) => link.label),
    ["Header only"],
  );
  assert.deepEqual(
    navigation(settings, "footerNavigation").map((link) => link.label),
    ["Storage + reheating", "Footer only"],
  );
  const html = renderToStaticMarkup(createElement(SiteFooter, { settings }));
  assert.ok(html.indexOf("Storage + reheating") < html.indexOf("Footer only"));
  assert.ok(!html.includes("Header only"));
  assert.equal(
    renderToStaticMarkup(
      createElement(SiteFooter, {
        settings: { ...settings, footerNavigation: [] },
      }),
    ),
    "",
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(SiteFooter, {
        settings: { ...settings, footerNavigation: undefined },
      }),
    ),
    "",
  );
});
test("each menu is capped separately at seven items", () => {
  const settings = {
    ...base,
    headerNavigation: Array.from({ length: 9 }, (_, i) =>
      item(`Header ${i}`, `/h-${i}`),
    ),
    footerNavigation: Array.from({ length: 8 }, (_, i) =>
      item(`Footer ${i}`, `/f-${i}`),
    ),
  };
  assert.equal(navigation(settings, "headerNavigation").length, 7);
  assert.equal(navigation(settings, "footerNavigation").length, 7);
});
test("split migration preserves shared order, appends sortable storage, and leaves unrelated utility labels alone", () => {
  const shared = [item("Order", "/#products"), item("Our story", "/about")];
  const result = separateNavigation({
    navigation: shared,
    utilityLabels: { storage: "Bread care", privacy: "Privacy", cart: "Bag" },
  });
  assert.deepEqual(result?.set.headerNavigation, shared);
  assert.deepEqual(result?.set.footerNavigation.slice(0, 2), shared);
  assert.equal(result?.set.footerNavigation[2].label, "Bread care");
  assert.equal(result?.set.footerNavigation[2].href, "/storage-heating");
  assert.deepEqual(result?.unset, ["navigation", "utilityLabels.storage"]);
  const draft = separateNavigation({
    navigation: [item("Draft menu", "/recipes")],
    utilityLabels: { storage: "Draft care" },
  });
  assert.equal(draft?.set.headerNavigation[0].label, "Draft menu");
  assert.equal(draft?.set.footerNavigation[1].label, "Draft care");
});
test("split migration preserves edited separate lists including empty ones and is idempotent", () => {
  const header = [item("Custom header", "/about")];
  const result = separateNavigation({
    headerNavigation: header,
    footerNavigation: [],
    navigation: [item("Old menu", "/pickup")],
    utilityLabels: { storage: "Old storage" },
  });
  assert.deepEqual(result?.set, {});
  assert.equal(
    separateNavigation({
      headerNavigation: header,
      footerNavigation: [],
      utilityLabels: { privacy: "Privacy" },
    }),
    null,
  );
});
test("split migration avoids duplicate storage items and prevents silent truncation", () => {
  const storage = item("Already in menu", "/storage-heating", "existing");
  const result = separateNavigation({
    navigation: [storage],
    utilityLabels: { storage: "Old utility label" },
  });
  assert.deepEqual(result?.set.footerNavigation, [storage]);
  assert.throws(
    () =>
      separateNavigation({
        navigation: Array.from({ length: 7 }, (_, i) =>
          item(`Item ${i}`, `/item-${i}`),
        ),
        utilityLabels: { storage: "Storage + reheating" },
      }),
    /preserve all items/,
  );
});
