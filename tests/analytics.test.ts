import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoogleAnalytics } from "@next/third-parties/google";
import { trackCheckoutEvent } from "../src/lib/analytics";

test("checkout analytics is safe on the server", () => {
  assert.doesNotThrow(() => {
    trackCheckoutEvent("order_preview_view", { has_valid_pickup_date: false });
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
    trackCheckoutEvent("order_preview_view", { has_valid_pickup_date: false });

    assert.equal(browser.dataLayer?.length, 1);
    const command = Array.from(browser.dataLayer[0] as IArguments);
    assert.deepEqual(command, [
      "event",
      "order_preview_view",
      {
        has_valid_pickup_date: false,
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
