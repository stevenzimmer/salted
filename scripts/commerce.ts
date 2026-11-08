import { writeFile } from "node:fs/promises";
import { eq, inArray, and, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { z } from "zod";
import { withDatabase } from "../src/db/client";
import {
  orders,
  orderItems,
  pickupDates,
  syncRuns,
  marketingSubscriptions,
} from "../src/db/schema";
import {
  openPickupDate,
  closePickupDate,
  listPickupDates,
} from "../src/commerce/pickups";
import { reconcileCheckouts } from "../src/commerce/checkout";
import { CommerceError } from "../src/commerce/validation";
import { pruneRateLimitBuckets } from "../src/commerce/maintenance";
async function main() {
  const command = process.argv[2];
  try {
    if (command === "migrate") {
      const direct = process.env.DATABASE_URL_UNPOOLED;
      if (!direct || new URL(direct).hostname.includes("-pooler"))
        throw new Error(
          "A direct DATABASE_URL_UNPOOLED is required for migrations.",
        );
      await withDatabase(
        (db) => migrate(db, { migrationsFolder: "./drizzle" }),
        direct,
      );
      console.log("Commerce migrations applied successfully.");
    } else if (command === "pickup") {
      const action = process.argv[3];
      if (action === "list")
        console.log(JSON.stringify(await withDatabase(listPickupDates)));
      else if (action === "open") {
        const pickup = await withDatabase((db) =>
          openPickupDate(db, process.argv[4] ?? ""),
        );
        console.log(
          JSON.stringify({
            date: pickup.date,
            enabled: pickup.enabled,
            pickupStart: pickup.startTime,
            pickupEnd: pickup.endTime,
            cutoffAt: pickup.cutoffAt,
            inventoryMode: "uncapped",
          }),
        );
      } else if (action === "close") {
        const day = process.argv[4] ?? "";
        await withDatabase((db) => closePickupDate(db, day));
        console.log(JSON.stringify({ date: day, enabled: false }));
      } else
        throw new Error(
          "Use commerce:pickup -- list | open YYYY-MM-DD | close YYYY-MM-DD.",
        );
    } else if (command === "prune-rate-limits") {
      const removedRateLimitBuckets = await withDatabase((db) =>
        pruneRateLimitBuckets(db),
      );
      console.log(JSON.stringify({ removedRateLimitBuckets }));
    } else if (command === "reconcile") {
      const result = await reconcileCheckouts();
      console.log(JSON.stringify(result));
      if (result.failed) process.exitCode = 1;
    } else if (command === "check") {
      await withDatabase(async (db) => {
        const result = await db.execute(
          sql`select current_database() as database, count(*)::int as inventory_rows from inventory`,
        );
        console.log(
          JSON.stringify({
            databaseConnected: result.rows.length === 1,
            legacyInventoryRows: result.rows[0]?.inventory_rows,
          }),
        );
        const errors = await db
          .select({
            status: syncRuns.status,
            message: syncRuns.message,
            at: syncRuns.createdAt,
          })
          .from(syncRuns)
          .orderBy(sql`${syncRuns.createdAt} desc`)
          .limit(5);
        console.log(JSON.stringify({ recentSyncs: errors }));
      });
    } else if (command === "export") {
      const day = z.iso.date().parse(process.argv[3]);
      const file = process.argv[4];
      if (!file)
        throw new Error(
          "Usage: npm run commerce:export -- YYYY-MM-DD /private/path/pickup.csv",
        );
      const rows = await withDatabase((db) =>
        db
          .select({
            number: orders.orderNumber,
            name: orders.customerName,
            email: orders.customerEmail,
            phone: orders.customerPhone,
            marketingOptIn: orders.marketingOptIn,
            marketingConsentAt: orders.marketingConsentAt,
            marketingConsentSource: orders.marketingConsentSource,
            marketingConsentVersion: orders.marketingConsentVersion,
            marketingConsentText: orders.marketingConsentText,
            marketingSubscribedNow: sql<boolean>`coalesce(${marketingSubscriptions.subscribed},false)`,
            marketingUnsubscribedAt: marketingSubscriptions.unsubscribedAt,
            total: orders.totalCents,
            status: orders.paymentStatus,
            productId: orderItems.productId,
            variantId: orderItems.variantId,
            product: orderItems.productNameSnapshot,
            variant: orderItems.variantNameSnapshot,
            quantity: orderItems.quantity,
            lineTotal: orderItems.lineTotalCents,
          })
          .from(orders)
          .innerJoin(pickupDates, eq(orders.pickupDateId, pickupDates.id))
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .leftJoin(
            marketingSubscriptions,
            sql`${marketingSubscriptions.email}=lower(trim(${orders.customerEmail}))`,
          )
          .where(
            and(
              eq(pickupDates.date, day),
              inArray(orders.paymentStatus, ["paid", "partially_refunded"]),
            ),
          )
          .orderBy(
            orders.orderNumber,
            orderItems.productId,
            orderItems.variantId,
          ),
      );
      const cell = (value: unknown) => {
        let text =
          value instanceof Date ? value.toISOString() : String(value ?? "");
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replaceAll('"', '""') + '"';
      };
      const columns = [
        "number",
        "name",
        "email",
        "phone",
        "marketingOptIn",
        "marketingConsentAt",
        "marketingConsentSource",
        "marketingConsentVersion",
        "marketingConsentText",
        "marketingSubscribedNow",
        "marketingUnsubscribedAt",
        "total",
        "status",
        "productId",
        "variantId",
        "product",
        "variant",
        "quantity",
        "lineTotal",
      ] as const;
      await writeFile(
        file,
        [
          columns.join(","),
          ...rows.map((row) => columns.map((k) => cell(row[k])).join(",")),
        ].join("\r\n"),
        { mode: 0o600, flag: "wx" },
      );
      const summary = new Map<string, number>();
      for (const row of rows) {
        const key = `${row.productId} / ${row.variantId}`;
        summary.set(key, (summary.get(key) ?? 0) + row.quantity);
      }
      console.log(
        JSON.stringify({
          pickupDate: day,
          orders: new Set(rows.map((r) => r.number)).size,
          exportedLines: rows.length,
          productionSummary: Object.fromEntries(summary),
          file,
        }),
      );
    } else
      throw new Error(
        "Use migrate, pickup, reconcile, prune-rate-limits, check or export. CMS menu synchronization has been retired.",
      );
  } catch (error) {
    // Driver/Stripe errors may include connection strings or response bodies.
    console.error(
      command === "pickup" && error instanceof CommerceError
        ? error.message
        : command === "pickup" && error instanceof z.ZodError
          ? "Choose a valid Friday in YYYY-MM-DD format. Use commerce:pickup -- list | open YYYY-MM-DD | close YYYY-MM-DD."
          : `Commerce ${command} failed. Verify credentials, migration state and service connectivity.`,
    );
    process.exitCode = 1;
  }
}
void main().catch(() => {
  console.error(
    "Commerce operation failed; check credentials and connectivity.",
  );
  process.exitCode = 1;
});
