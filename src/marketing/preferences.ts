import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Database, Transaction } from "../db/client";
import { marketingSubscriptions } from "../db/schema";
import { marketingEmail } from "../lib/marketing-input";

type PreferenceDatabase = Database | Transaction;
export async function recordPaidMarketingConsent(
  db: PreferenceDatabase,
  input: { email: string; orderId: string; consentAt: Date },
) {
  const email = marketingEmail.parse(input.email);
  await db
    .insert(marketingSubscriptions)
    .values({
      email,
      subscribed: true,
      lastConsentOrderId: input.orderId,
      lastConsentAt: input.consentAt,
    })
    .onConflictDoUpdate({
      target: marketingSubscriptions.email,
      set: {
        subscribed: true,
        lastConsentOrderId: input.orderId,
        lastConsentAt: input.consentAt,
        unsubscribedAt: null,
        unsubscribeSource: null,
        updatedAt: new Date(),
      },
      // Old checkout consent cannot override a later withdrawal, including delayed payments.
      setWhere: and(
        or(
          isNull(marketingSubscriptions.lastConsentAt),
          gt(
            sql`excluded.last_consent_at`,
            marketingSubscriptions.lastConsentAt,
          ),
        ),
        or(
          isNull(marketingSubscriptions.unsubscribedAt),
          gt(
            sql`excluded.last_consent_at`,
            marketingSubscriptions.unsubscribedAt,
          ),
        ),
      ),
    });
}
export async function unsubscribeEmail(
  db: PreferenceDatabase,
  address: string,
) {
  const email = marketingEmail.parse(address);
  await db
    .insert(marketingSubscriptions)
    .values({
      email,
      subscribed: false,
      unsubscribedAt: new Date(),
      unsubscribeSource: "public_form",
    })
    .onConflictDoUpdate({
      target: marketingSubscriptions.email,
      set: {
        subscribed: false,
        unsubscribedAt: new Date(),
        unsubscribeSource: "public_form",
        updatedAt: new Date(),
      },
    });
}
export async function unsubscribeSubscription(
  db: PreferenceDatabase,
  subscriptionId: string,
): Promise<boolean> {
  const [record] = await db
    .select({ id: marketingSubscriptions.id })
    .from(marketingSubscriptions)
    .where(eq(marketingSubscriptions.id, subscriptionId));
  if (!record) return false;
  // Refresh the withdrawal time even if already suppressed: another checkout
  // may have captured consent since the previous withdrawal but not paid yet.
  await db
    .update(marketingSubscriptions)
    .set({
      subscribed: false,
      unsubscribedAt: new Date(),
      unsubscribeSource: "signed_link",
      updatedAt: new Date(),
    })
    .where(eq(marketingSubscriptions.id, subscriptionId));
  return true;
}
// Future delivery must check current status at send time, not an old order snapshot/CSV.
export async function canSendMarketingEmail(
  db: PreferenceDatabase,
  address: string,
): Promise<boolean> {
  const email = marketingEmail.parse(address);
  const [record] = await db
    .select({ subscribed: marketingSubscriptions.subscribed })
    .from(marketingSubscriptions)
    .where(eq(marketingSubscriptions.email, email));
  return record?.subscribed === true;
}
