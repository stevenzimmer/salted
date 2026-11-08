import test from "node:test";
import assert from "node:assert/strict";
import { activeOfferings, type Catalog } from "../src/commerce/catalog";
import {
  inventoryFor,
  maximumInventory,
  validPickupDates,
} from "../src/lib/availability";
import { scheduleInput } from "../src/lib/schedule-validation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuantitySelector } from "../src/components/commerce/quantity-selector";
import type { MockSchedule } from "../src/types/content";
import { migrateManualMenuCopy } from "../scripts/migrations/manual-menu-copy";
const catalog: Catalog = [
  {
    _id: "bread",
    id: "bread",
    displayName: "Bread",
    active: true,
    variants: [
      { id: "loaf", label: "Loaf", price: 1200, active: true },
      { id: "new-size", label: "New size", price: 2000, active: true },
      { id: "off", label: "Off", price: 2000, active: false },
    ],
  },
];
const now = new Date("2026-11-07T12:00:00Z");
test("cancellation wording migration changes only the previous seeded hold wording", () => {
  assert.deepEqual(
    migrateManualMenuCopy({
      checkout: { cancel: "End my previous checkout and release its hold" },
    }),
    { "checkout.cancel": "End my previous checkout" },
  );
  for (const cancel of [
    undefined,
    "",
    "Cancel checkout",
    "End my previous checkout",
  ])
    assert.equal(migrateManualMenuCopy({ checkout: { cancel } }), null);
  assert.equal(migrateManualMenuCopy({}), null);
});
const schedule: MockSchedule = {
  dates: [
    {
      id: "friday",
      date: "2026-11-13",
      pickupStart: "14:00",
      pickupEnd: "18:00",
      orderCutoff: "2026-11-11T23:59:59-08:00",
      enabled: true,
    },
  ],
  availability: [
    {
      pickupDateId: "friday",
      productId: "bread",
      variantId: "loaf",
      inventory: null,
    },
  ],
};
test("the launch menu uses published active products and sizes, including new stable identities", () => {
  assert.deepEqual(activeOfferings(catalog), [
    { productId: "bread", variantId: "loaf" },
    { productId: "bread", variantId: "new-size" },
  ]);
  assert.deepEqual(activeOfferings([{ ...catalog[0], active: false }]), []);
  assert.deepEqual(activeOfferings([catalog[0], catalog[0]]), []);
  assert.deepEqual(
    activeOfferings([
      {
        ...catalog[0],
        variants: [{ id: "bad", active: true, label: "Bad", price: 12.5 }],
      },
    ]),
    [],
  );
});
test("uncapped availability is explicit JSON null, while missing rows still mean unavailable", () => {
  const parsed = scheduleInput.parse(JSON.parse(JSON.stringify(schedule)));
  assert.equal(parsed.availability[0].inventory, null);
  assert.equal(
    inventoryFor(parsed.availability, "friday", "bread", "loaf"),
    Infinity,
  );
  assert.equal(
    inventoryFor(parsed.availability, "friday", "bread", "missing"),
    0,
  );
  assert.equal(maximumInventory(parsed, "bread", "loaf", now), Infinity);
  assert.equal(
    validPickupDates(
      [{ productId: "bread", variantId: "loaf", quantity: 20 }],
      parsed,
      now,
    ).length,
    1,
  );
  assert.equal(
    scheduleInput.safeParse({
      ...schedule,
      availability: [
        { pickupDateId: "friday", productId: "bread", variantId: "loaf" },
      ],
    }).success,
    false,
  );
});
test("complete-cart intersection, manual closure and Pacific cutoff remain enforced without stock caps", () => {
  const cart = [
    { productId: "bread", variantId: "loaf", quantity: 20 },
    { productId: "bread", variantId: "new-size", quantity: 1 },
  ];
  assert.equal(validPickupDates(cart, schedule, now).length, 0);
  const both = {
    ...schedule,
    availability: [
      ...schedule.availability,
      { ...schedule.availability[0], variantId: "new-size" },
    ],
  };
  assert.equal(validPickupDates(cart, both, now).length, 1);
  assert.equal(
    validPickupDates(
      cart,
      { ...both, dates: both.dates.map((d) => ({ ...d, enabled: false })) },
      now,
    ).length,
    0,
  );
  assert.equal(
    validPickupDates(cart, both, new Date("2026-11-12T07:59:59Z")).length,
    0,
  );
});
test("uncapped ordering retains the existing per-line input limit without rendering infinite quantities", () => {
  const html = renderToStaticMarkup(
    createElement(QuantitySelector, {
      value: 20,
      max: Infinity,
      onChange: () => {},
    }),
  );
  assert.match(html, /aria-label="Increase quantity" disabled=""/);
  assert.ok(!html.includes("Infinity"));
});
