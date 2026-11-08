import test from "node:test";
import assert from "node:assert/strict";
import { buildPickupSchedule } from "../src/commerce/schedule-model";
import { pickupDateForCart, validPickupDates } from "../src/lib/availability";
import { blackoutDatesInput, pickupCutoff } from "../src/lib/pickup-policy";
import { scheduleInput } from "../src/lib/schedule-validation";
import type { Catalog } from "../src/commerce/catalog";

const catalog: Catalog = [
  {
    _id: "bread",
    id: "bread",
    active: true,
    displayName: "Bread",
    variants: [
      { id: "loaf", active: true, label: "Loaf", price: 1200 },
      { id: "off", active: false, label: "Off", price: 2400 },
    ],
  },
];
const cart = [{ productId: "bread", variantId: "loaf", quantity: 20 }];
const now = new Date("2026-11-07T19:00:00Z");

test("future Fridays open by default with no database rows, weekly menus, stock or upper calendar horizon", () => {
  const schedule = scheduleInput.parse(
    JSON.parse(JSON.stringify(buildPickupSchedule(catalog, null))),
  );
  assert.deepEqual(schedule.dates, []);
  assert.deepEqual(schedule.availability, []);
  assert.equal(validPickupDates(cart, schedule, now)[0].date, "2026-11-13");
  assert.ok(pickupDateForCart(cart, schedule, "2026-11-13", now));
  assert.ok(pickupDateForCart(cart, schedule, "2098-01-03", now));
  for (const day of ["2026-11-12", "2026-11-14", "2026-11-06", "2026-02-30"])
    assert.equal(pickupDateForCart(cart, schedule, day, now), undefined);
});

test("published blackouts close only their dates; clearing the list reopens them", () => {
  const schedule = buildPickupSchedule(catalog, ["2026-11-13", "2026-12-25"]);
  assert.equal(pickupDateForCart(cart, schedule, "2026-11-13", now), undefined);
  assert.equal(pickupDateForCart(cart, schedule, "2026-12-25", now), undefined);
  assert.ok(pickupDateForCart(cart, schedule, "2026-11-20", now));
  assert.ok(
    pickupDateForCart(
      cart,
      buildPickupSchedule(catalog, []),
      "2026-11-13",
      now,
    ),
  );
  assert.ok(
    pickupDateForCart(
      cart,
      buildPickupSchedule(catalog, undefined),
      "2026-11-13",
      now,
    ),
  );
});

test("recurring dates enforce the complete active cart and per-line limit, with no inventory caps", () => {
  const schedule = buildPickupSchedule(catalog, []);
  for (const items of [
    [],
    [...cart, { ...cart[0], variantId: "off", quantity: 1 }],
    [{ ...cart[0], productId: "missing" }],
    [{ ...cart[0], quantity: 21 }],
    [{ ...cart[0], quantity: 1.5 }],
    [{ ...cart[0], quantity: 0 }],
    [...cart, { ...cart[0], quantity: 1 }],
  ])
    assert.equal(
      pickupDateForCart(items, schedule, "2026-11-13", now),
      undefined,
    );
  assert.equal(
    pickupDateForCart(
      cart,
      buildPickupSchedule([{ ...catalog[0], active: false }], []),
      "2026-11-13",
      now,
    ),
    undefined,
  );
});

test("Wednesday Pacific cutoff is enforced at the exact instant across DST", () => {
  const schedule = buildPickupSchedule(catalog, []);
  for (const day of ["2027-03-12", "2027-03-19", "2027-11-05", "2027-11-12"]) {
    const cutoff = pickupCutoff(day);
    assert.ok(
      pickupDateForCart(cart, schedule, day, new Date(cutoff.getTime() - 1)),
    );
    assert.equal(pickupDateForCart(cart, schedule, day, cutoff), undefined);
  }
});

test("malformed stored CMS dates and recurring wire data fail closed", () => {
  for (const dates of [
    ["2026-11-12"],
    ["2026-02-30"],
    [null],
    "2026-11-13",
    {},
  ]) {
    assert.equal(blackoutDatesInput.safeParse(dates).success, false);
    assert.throws(() => buildPickupSchedule(catalog, dates));
    assert.equal(
      scheduleInput.safeParse({
        dates: [],
        availability: [],
        recurring: { blackoutDates: dates, offerings: [] },
      }).success,
      false,
    );
  }
});
