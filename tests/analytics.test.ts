import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoogleAnalytics } from "@next/third-parties/google";
import { stegaEncodeSourceMap } from "@sanity/client/stega";
import {
  trackAddToCart,
  trackCheckoutEvent,
  trackSpecialOrderEvent,
  trackProductFilterSelect,
} from "../src/lib/analytics";

import { products } from "./fixtures/catalog";

test("checkout analytics is safe on the server", () => {
  assert.doesNotThrow(() => {
    trackCheckoutEvent("checkout_closed", { step_name: "bag", item_count: 0 });
    trackSpecialOrderEvent("special_order_form_start");
  });
});

test("early views are queued before the Google script loads", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser: { dataLayer?: unknown[] } = {};
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });

  try {
    // Initialize the same GA integration used by the layout, without loading
    // Google's network script or sending any test data to the real property.
    renderToStaticMarkup(createElement(GoogleAnalytics, { gaId: "G-TEST" }));
    trackCheckoutEvent("checkout_closed", { step_name: "bag", item_count: 0 });

    assert.equal(browser.dataLayer?.length, 1);
    const command = Array.from(browser.dataLayer[0] as IArguments);
    assert.deepEqual(command, [
      "event",
      "checkout_closed",
      {
        step_name: "bag",
        item_count: 0,
        flow_version: "checkout_preview_v1",
        preview_mode: true,
      },
    ]);

    // The GA initializer preserves the queue instead of replacing early views.
    browser.dataLayer = browser.dataLayer || [];
    trackCheckoutEvent("checkout_closed", {
      step_name: "pickup",
      item_count: 2,
    });
    assert.equal(browser.dataLayer.length, 2);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("a blocked analytics queue cannot break checkout", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: Object.defineProperty({}, "dataLayer", {
      get() {
        throw new Error("Analytics blocked");
      },
    }),
  });

  try {
    assert.doesNotThrow(() => {
      trackAddToCart(
        {
          productId: "pesto-mozzarella",
          variantId: "round",
          quantity: 1,
        },
        products,
      );
    });
    assert.doesNotThrow(() => {
      trackSpecialOrderEvent("special_order_form_submit");
      trackProductFilterSelect({
        filter_id: "all",
        filter_label: "All",
        category_id: "all",
        show_all: true,
        result_count: 2,
      });
      trackCheckoutEvent("checkout_back", {
        from_step: "pickup",
        to_step: "bag",
        item_count: 1,
      });
    });
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("special-order events contain only fixed form metadata and no checkout preview flags", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser: { dataLayer?: unknown[] } = {};
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });

  try {
    renderToStaticMarkup(createElement(GoogleAnalytics, { gaId: "G-TEST" }));
    trackSpecialOrderEvent("special_order_form_start");
    trackSpecialOrderEvent("special_order_form_submit");
    assert.deepEqual(
      browser.dataLayer?.map((entry) => Array.from(entry as IArguments)),
      [
        ["event", "special_order_form_start", { form_id: "special_order" }],
        ["event", "special_order_form_submit", { form_id: "special_order" }],
      ],
    );
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("product filter analytics cleans CMS labels and preserves zero results", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as unknown[] };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });
  try {
    renderToStaticMarkup(createElement(GoogleAnalytics, { gaId: "G-TEST" }));
    const { label } = stegaEncodeSourceMap(
      { label: "Seasonal" },
      {
        documents: [{ _id: "commerceCopy", _type: "commerceCopy" }],
        paths: ["$['product']['filters'][0]['label']"],
        mappings: {
          "$['label']": {
            type: "value",
            source: { type: "documentValue", document: 0, path: 0 },
          },
        },
      },
      { enabled: true, studioUrl: "/studio", filter: () => true },
    );
    trackProductFilterSelect({
      filter_id: "seasonal-filter",
      filter_label: label,
      category_id: "category-seasonal",
      show_all: false,
      result_count: 0,
    });
    assert.deepEqual(Array.from(browser.dataLayer[0] as IArguments), [
      "event",
      "product_filter_select",
      {
        filter_id: "seasonal-filter",
        filter_label: "Seasonal",
        category_id: "category-seasonal",
        show_all: false,
        result_count: 0,
      },
    ]);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("add_to_cart uses catalog prices in dollars and only the quantity added", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as unknown[] };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });

  try {
    renderToStaticMarkup(createElement(GoogleAnalytics, { gaId: "G-TEST" }));
    const item = {
      productId: "pesto-mozzarella",
      variantId: "square",
      quantity: 2,
      price: 1,
      value: 999,
    };
    trackAddToCart(item, products);
    assert.equal(browser.dataLayer.length, 1);
    assert.deepEqual(Array.from(browser.dataLayer[0] as IArguments), [
      "event",
      "add_to_cart",
      {
        currency: "USD",
        value: 30,
        items: [
          {
            item_id: "pesto-mozzarella",
            item_name: "Pesto Mozzarella",
            item_variant: "square",
            item_category: "focaccia",
            price: 15,
            quantity: 2,
          },
        ],
        flow_version: "checkout_preview_v1",
        preview_mode: true,
      },
    ]);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("unknown products, variants and invalid quantities do not emit add_to_cart", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as unknown[] };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });

  try {
    const item = {
      productId: "pesto-mozzarella",
      variantId: "round",
      quantity: 1,
    };
    trackAddToCart({ ...item, productId: "unknown" }, products);
    trackAddToCart({ ...item, variantId: "unknown" }, products);
    for (const quantity of [0, -1, 1.5, Number.NaN, Infinity]) {
      trackAddToCart({ ...item, quantity }, products);
    }
    assert.equal(browser.dataLayer.length, 0);
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
