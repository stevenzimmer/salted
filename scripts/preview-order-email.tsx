import { writeFile, copyFile, mkdir } from "node:fs/promises";
import { render } from "react-email";
import {
  OrderConfirmationEmail,
  type OrderEmailDetails,
} from "../src/emails/order-confirmation";
import { initialOrderEmailCopy } from "./migrations/order-email";
import { initialPickupReminderCopy } from "./migrations/pickup-reminder";
import { PickupReminderEmail } from "../src/emails/pickup-reminder";

// Synthetic preview only; never reads order data or sends mail.
async function main() {
  const directory = "/tmp/salted-email-preview";
  await mkdir(directory, { recursive: true });
  await copyFile(
    "public/images/brand/email-wordmark.png",
    `${directory}/email-wordmark.png`,
  );
  const order: OrderEmailDetails = {
    number: "SF-PREVIEW",
    customerName: "Example Customer",
    customerEmail: "example@example.invalid",
    customerPhone: null,
    totalCents: 4800,
    pickup: {
      date: "2026-11-20",
      startTime: "14:00:00",
      endTime: "18:00:00",
      timezone: "America/Los_Angeles",
    },
    items: [
      {
        name: "Example focaccia",
        variant: "Whole",
        quantity: 2,
        lineTotalCents: 4800,
      },
    ],
  };
  for (const audience of ["customer", "business"] as const) {
    const html = await render(
      <OrderConfirmationEmail
        audience={audience}
        order={order}
        copy={initialOrderEmailCopy}
        receiptUrl="https://pay.stripe.com/receipts/preview"
        confirmationUrl="https://saltedfocaccia.com/order/open#confirmation=preview"
        wordmarkUrl="http://localhost:8766/email-wordmark.png"
      />,
    );
    await writeFile(`${directory}/${audience}.html`, html, { mode: 0o600 });
  }
  const reminder = (
    <PickupReminderEmail
      order={order}
      copy={{ ...initialOrderEmailCopy, ...initialPickupReminderCopy }}
      confirmationUrl="https://saltedfocaccia.com/order/open#confirmation=preview"
      wordmarkUrl="http://localhost:8766/email-wordmark.png"
    />
  );
  await writeFile(`${directory}/pickup-reminder.html`, await render(reminder), {
    mode: 0o600,
  });
  await writeFile(
    `${directory}/pickup-reminder.txt`,
    await render(reminder, { plainText: true }),
    { mode: 0o600 },
  );
  console.log(
    `Synthetic email previews written to ${directory}. No emails sent.`,
  );
}
void main();
