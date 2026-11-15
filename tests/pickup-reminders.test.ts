import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { render } from "react-email";
import {
  pickupReminderDate,
  deliverPickupReminders,
} from "../src/commerce/pickup-reminders";
import { handlePickupReminderCron } from "../src/commerce/pickup-reminder-cron";
import {
  PickupReminderEmail,
  type PickupReminderEmailProps,
} from "../src/emails/pickup-reminder";
import { initialOrderEmailCopy } from "../scripts/migrations/order-email";
import {
  initialPickupReminderCopy,
  migratePickupReminderCopy,
} from "../scripts/migrations/pickup-reminder";

test("Hobby cron entries each run weekly and exactly one accepts the 9am Pacific hour in either DST season", () => {
  const config: {
    fluid: boolean;
    crons: { path: string; schedule: string }[];
  } = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  );
  assert.equal(config.fluid, true);
  // Each expression must contain a single minute/hour: the Hobby limit applies
  // per job. Separate UTC jobs preserve DST without a subdaily expression.
  assert.equal(config.crons.length, 2);
  const hours = config.crons.map(({ path, schedule }) => {
    assert.equal(path, "/api/cron/pickup-reminders");
    assert.match(schedule, /^0 (16|17) \* \* 5$/);
    return Number(schedule.split(" ")[1]);
  });
  assert.equal(new Set(hours).size, 2);
  for (const day of ["2026-03-06", "2026-03-13", "2026-10-30", "2026-11-06"]) {
    // Hobby may invoke at any minute within the configured hour.
    for (const minute of ["00", "30", "59"]) {
      const eligible = hours.map((hour) =>
        pickupReminderDate(new Date(`${day}T${hour}:${minute}:59Z`)),
      );
      assert.deepEqual(eligible.filter(Boolean), [day]);
    }
  }
});

test("Friday reminders start at 9am Pacific across DST and manual recovery stops at 2pm", () => {
  for (const [date, offset] of [
    ["2026-07-10", "-07:00"],
    ["2026-11-20", "-08:00"],
  ]) {
    for (const clock of ["09:00:00", "09:59:59"]) {
      assert.equal(
        pickupReminderDate(new Date(`${date}T${clock}${offset}`)),
        date,
      );
    }
    for (const clock of [
      "00:00:00",
      "08:59:59",
      "10:00:00",
      "14:00:00",
      "23:59:59",
    ])
      assert.equal(
        pickupReminderDate(new Date(`${date}T${clock}${offset}`)),
        null,
      );
    assert.equal(
      pickupReminderDate(new Date(`${date}T13:59:59${offset}`), true),
      date,
    );
    assert.equal(
      pickupReminderDate(new Date(`${date}T14:00:00${offset}`), true),
      null,
    );
  }
  for (const date of ["2026-11-19", "2026-11-21"])
    assert.equal(pickupReminderDate(new Date(`${date}T09:00:00-08:00`)), null);
});

const props: PickupReminderEmailProps = {
  copy: { ...initialOrderEmailCopy, ...initialPickupReminderCopy },
  confirmationUrl: "https://saltedfocaccia.com/order/open#confirmation=example",
  wordmarkUrl: "https://saltedfocaccia.com/images/brand/email-wordmark.png",
  order: {
    number: "SF-EXAMPLE",
    customerName: "Private Customer",
    customerEmail: "private@example.invalid",
    customerPhone: "+15555555555",
    totalCents: 4800,
    pickup: {
      date: "2026-11-20",
      startTime: "14:00:00",
      endTime: "18:00:00",
      timezone: "America/Los_Angeles",
    },
    items: [
      {
        name: "Focaccia <script>",
        variant: "Whole",
        quantity: 2,
        lineTotalCents: 4800,
      },
    ],
  },
};
test("reminder uses the confirmation branding, playful CMS copy, pickup details and saved order summary", async () => {
  const template = createElement(PickupReminderEmail, props);
  const html = await render(template);
  const text = await render(template, { plainText: true });
  assert.match(html, /email-wordmark\.png/);
  assert.match(html, /rgb\(250,243,231\)/);
  assert.match(html, /Focaccia &lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  for (const output of [html, text]) {
    assert.ok(
      output
        .toLowerCase()
        .includes(initialPickupReminderCopy.reminderHeading.toLowerCase()),
    );
    assert.match(output, /November 20, 2026/);
    assert.match(output, /2–6pm/);
    assert.ok(output.includes(initialOrderEmailCopy.pickupAddress));
    assert.match(output, /Whole/);
    assert.match(output, /\$48/);
    assert.match(output, /SF-EXAMPLE/);
    assert.match(output, /order\/open#confirmation=example/);
    assert.doesNotMatch(
      output,
      /Private Customer|private@example.invalid|15555555555|View Stripe receipt|Your order is confirmed/,
    );
  }
  assert.ok(Buffer.byteLength(html) < 102_000);
});
test("cleared reminder fields remove copy and address without confirmation or migration fallbacks", async () => {
  const html = await render(
    createElement(PickupReminderEmail, { ...props, copy: {} }),
  );
  assert.doesNotMatch(
    html,
    /hot date|Your order is confirmed|Mountaingate|Google Maps/,
  );
  assert.match(html, /SF-EXAMPLE/);
  for (const group of [undefined, null, {}, { _type: "object" }])
    assert.equal(migratePickupReminderCopy({ orderEmail: group }), null);
  assert.deepEqual(
    migratePickupReminderCopy({ orderEmail: initialOrderEmailCopy }),
    Object.fromEntries(
      Object.entries(initialPickupReminderCopy).map(([key, value]) => [
        `orderEmail.${key}`,
        value,
      ]),
    ),
  );
  assert.equal(
    migratePickupReminderCopy({
      orderEmail: {
        customerHeading: "Edited",
        reminderSubject: "",
        reminderHeading: null,
        reminderBody: "Edited reminder",
      },
    }),
    null,
  );
});
test("outside the reminder window no database, CMS or email service is called", async () => {
  const result = await deliverPickupReminders({
    now: () => new Date("2026-11-20T08:59:59-08:00"),
    database: async () => {
      throw new Error("Unexpected database access");
    },
  });
  assert.equal(result.skipped, true);
});
test("cron fails closed, disables previews, returns only counts and reports incomplete deliveries", async () => {
  const keys = [
    "CRON_SECRET",
    "PICKUP_REMINDERS_ENABLED",
    "VERCEL_ENV",
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let calls = 0;
  const run = async () => {
    calls++;
    return { sent: 1, failed: 0, remaining: 0, needsReview: 0, skipped: false };
  };
  const secret = "synthetic-cron-secret-at-least-32-characters";
  const request = (token = secret) =>
    new Request("https://saltedfocaccia.com/api/cron/pickup-reminders", {
      headers: { authorization: `Bearer ${token}` },
    });
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await handlePickupReminderCron(request(), run)).status, 503);
    process.env.CRON_SECRET = secret;
    assert.equal(
      (await handlePickupReminderCron(request("wrong"), run)).status,
      401,
    );
    process.env.PICKUP_REMINDERS_ENABLED = "false";
    assert.equal((await handlePickupReminderCron(request(), run)).status, 200);
    process.env.PICKUP_REMINDERS_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    assert.equal((await handlePickupReminderCron(request(), run)).status, 200);
    assert.equal(calls, 0);
    process.env.VERCEL_ENV = "production";
    const success = await handlePickupReminderCron(request(), run);
    assert.equal(success.status, 200);
    assert.equal(success.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await success.json(), await run());
    assert.equal(
      (
        await handlePickupReminderCron(request(), async () => ({
          ...(await run()),
          remaining: 1,
        }))
      ).status,
      503,
    );
    const failure = await handlePickupReminderCron(request(), async () => {
      throw new Error("private provider response");
    });
    assert.equal(failure.status, 503);
    assert.doesNotMatch(await failure.text(), /private provider response/);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
