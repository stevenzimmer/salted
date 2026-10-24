import test from "node:test";
import assert from "node:assert/strict";
import {
  createPickupDates,
  pacificCutoff,
  pacificToday,
} from "../src/data/pickup-dates";
import { getMockSchedule } from "../src/data/product-availability";
import {
  isPickupOpen,
  maximumInventory,
  validPickupDates,
} from "../src/lib/availability";
import { normalizeCart, cartSubtotal } from "../src/lib/cart";
import {
  minimumSpecialOrderDate,
  validateSpecialOrder,
  type SpecialOrderInput,
} from "../src/lib/special-orders";
import type { CartItem } from "../src/types/content";

const now = new Date("2026-10-24T19:00:00Z");
const schedule = getMockSchedule(now);
const pesto: CartItem = {
  productId: "pesto-mozzarella",
  variantId: "square",
  quantity: 1,
};
const chili: CartItem = {
  productId: "parmesan-chili-crisp",
  variantId: "round",
  quantity: 2,
};

test("Friday fixtures carry Wednesday Pacific cutoffs and explicit DST offsets", () => {
  for (const date of createPickupDates(now)) {
    assert.equal(new Date(`${date.date}T12:00:00Z`).getUTCDay(), 5);
    assert.equal(new Date(date.orderCutoff).getUTCDay(), 4); // Wednesday night Pacific is Thursday UTC.
  }
  assert.equal(pacificCutoff("2026-10-28"), "2026-10-28T23:59:59-07:00");
  assert.equal(pacificCutoff("2026-11-04"), "2026-11-04T23:59:59-08:00");
});

test("Pacific calendar dates are independent of UTC and browser timezone", () => {
  assert.equal(pacificToday(new Date("2026-10-25T01:00:00Z")), "2026-10-24");
});

test("cutoff rejects the instant it closes, past dates, and disabled dates", () => {
  const date = schedule.dates.find((date) => date.date === "2026-10-30");
  assert.ok(date);
  assert.equal(isPickupOpen(date, new Date("2026-10-29T06:59:58Z")), true);
  assert.equal(isPickupOpen(date, new Date("2026-10-29T06:59:59Z")), false);
  assert.equal(isPickupOpen(date, new Date("2026-10-30T20:00:00Z")), false);
  assert.equal(isPickupOpen({ ...date, enabled: false }, now), false);
});

test("checkout offers only the intersection of all cart lines", () => {
  const pestoDates = validPickupDates([pesto], schedule, now);
  const both = validPickupDates([pesto, chili], schedule, now);
  assert.ok(pestoDates.length > both.length);
  assert.equal(
    pestoDates.some((date) => date.date === "2026-10-30"),
    true,
  );
  assert.equal(
    both.some((date) => date.date === "2026-10-30"),
    false,
  );
  assert.equal(
    both.some((date) => date.date === "2026-11-06"),
    true,
  );
  assert.equal(
    both.some((date) => date.date === "2026-11-13"),
    false,
  );
  assert.equal(
    both.every((date) => isPickupOpen(date, now)),
    true,
  );
});

test("empty carts and missing inventory never yield valid dates", () => {
  assert.deepEqual(validPickupDates([], schedule, now), []);
  assert.deepEqual(
    validPickupDates([{ ...pesto, variantId: "unknown" }], schedule, now),
    [],
  );
  assert.deepEqual(
    validPickupDates([pesto], { ...schedule, availability: [] }, now),
    [],
  );
});

test("quantity checks include every duplicate line", () => {
  assert.ok(
    validPickupDates([{ ...pesto, quantity: 12 }], schedule, now).length > 0,
  );
  assert.deepEqual(
    validPickupDates([{ ...pesto, quantity: 13 }], schedule, now),
    [],
  );
  assert.deepEqual(
    validPickupDates(
      [
        { ...pesto, quantity: 7 },
        { ...pesto, quantity: 6 },
      ],
      schedule,
      now,
    ),
    [],
  );
  assert.deepEqual(
    validPickupDates([{ ...pesto, quantity: -1 }], schedule, now),
    [],
  );
  assert.deepEqual(
    validPickupDates([{ ...pesto, quantity: 1.5 }], schedule, now),
    [],
  );
});

test("sold-out, unavailable-size, and low-stock fixtures are separate inventory states", () => {
  assert.equal(maximumInventory(schedule, "seasonal-flavor", "round", now), 0);
  assert.equal(maximumInventory(schedule, "jalapeno-cheddar", "pan", now), 0);
  assert.equal(
    maximumInventory(schedule, "specialty-sourdough", "loaf", now),
    3,
  );
  assert.deepEqual(
    validPickupDates(
      [{ productId: "specialty-sourdough", variantId: "loaf", quantity: 4 }],
      schedule,
      now,
    ),
    [],
  );
});

test("cart normalization rejects malformed and unknown data, merges duplicates, and strips extra fields", () => {
  assert.deepEqual(normalizeCart(null), []);
  assert.deepEqual(normalizeCart({ items: [pesto] }), []);
  assert.deepEqual(
    normalizeCart([
      null,
      {},
      { ...pesto, quantity: "1" },
      { ...pesto, quantity: 0 },
      { ...pesto, productId: "unknown" },
    ]),
    [],
  );
  assert.deepEqual(
    normalizeCart([{ ...pesto, date: "2026-11-06", price: 1 }, pesto]),
    [{ ...pesto, quantity: 2 }],
  );
  assert.equal(normalizeCart([{ ...pesto, quantity: 999 }])[0].quantity, 20);
});

test("totals use catalog prices in cents, including selected variants", () => {
  assert.equal(cartSubtotal([pesto, chili]), 3100);
  assert.equal(
    cartSubtotal([
      { productId: "classic-focaccia", variantId: "pan", quantity: 2 },
    ]),
    3800,
  );
  assert.equal(cartSubtotal([]), 0);
});

const validRequest: SpecialOrderInput = {
  name: "Bread Person",
  email: "bread@example.com",
  phone: "(916) 555-0100",
  date: "2026-10-29",
  products: "Four pans of classic focaccia",
  quantity: "4",
  eventType: "Dinner",
  notes: "",
};

test("special orders accept five Pacific calendar days without creating a submission", () => {
  assert.equal(minimumSpecialOrderDate(now), "2026-10-29");
  assert.deepEqual(validateSpecialOrder(validRequest, now), {});
  assert.ok(
    validateSpecialOrder({ ...validRequest, date: "2026-10-28" }, now).date,
  );
});

test("special orders reject missing contact details, invalid calendar dates, and invalid quantities", () => {
  const errors = validateSpecialOrder(
    {
      ...validRequest,
      name: "",
      email: "invalid",
      phone: "123",
      date: "2026-02-30",
      quantity: "0",
      products: "bread",
    },
    now,
  );
  assert.deepEqual(Object.keys(errors).sort(), [
    "date",
    "email",
    "name",
    "phone",
    "products",
    "quantity",
  ]);
  assert.ok(
    validateSpecialOrder({ ...validRequest, date: "not-a-date" }, now).date,
  );
  assert.ok(
    validateSpecialOrder({ ...validRequest, quantity: "1.5" }, now).quantity,
  );
});
