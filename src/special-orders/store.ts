import { eq } from "drizzle-orm";
import { withDatabase } from "../db/client";
import { specialOrderRequests } from "../db/schema";
import { fetchMarketingConsentLabel } from "../commerce/catalog";
import { resolveMarketingConsent } from "../commerce/marketing-consent";
import { CommerceError, hash } from "../commerce/validation";
import {
  specialOrderSubmissionInput,
  validateSpecialOrder,
  type SpecialOrderErrors,
  type SpecialOrderSubmission,
} from "../lib/special-orders";
import { recordSpecialOrderMarketingConsent } from "../marketing/preferences";

export class SpecialOrderValidationError extends Error {
  constructor(public errors: SpecialOrderErrors) {
    super("Check the special-order request fields.");
  }
}

export function specialOrderFingerprint(input: SpecialOrderSubmission) {
  return hash(
    JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone,
      date: input.date,
      products: input.products,
      marketingOptIn: input.marketingOptIn,
      marketingConsentText: input.marketingOptIn
        ? input.marketingConsentText
        : null,
    }),
  );
}

function verifyRetry(
  row: typeof specialOrderRequests.$inferSelect,
  fingerprint: string,
) {
  if (row.fingerprint !== fingerprint)
    throw new CommerceError(
      "request_conflict",
      "This request key has already been used.",
    );
  return row.id;
}

export async function saveSpecialOrder(
  value: unknown,
  dependencies: {
    database?: typeof withDatabase;
    consentLabel?: typeof fetchMarketingConsentLabel;
    now?: Date;
  } = {},
): Promise<string> {
  const input = specialOrderSubmissionInput.parse(value);
  const database = dependencies.database ?? withDatabase;
  const fingerprint = specialOrderFingerprint(input);
  const [existing] = await database((db) =>
    db
      .select()
      .from(specialOrderRequests)
      .where(eq(specialOrderRequests.requestKey, input.requestKey)),
  );
  // A saved retry acknowledges the original request without revalidating its old
  // date/wording or replaying consent after a subsequent unsubscribe.
  if (existing) return verifyRetry(existing, fingerprint);
  const now = dependencies.now ?? new Date();
  const errors = validateSpecialOrder(input, now);
  if (Object.keys(errors).length) throw new SpecialOrderValidationError(errors);
  const publishedLabel = input.marketingOptIn
    ? await (dependencies.consentLabel ?? fetchMarketingConsentLabel)()
    : null;
  const consent = resolveMarketingConsent(input, publishedLabel);
  return database((db) =>
    db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(specialOrderRequests)
        .values({
          requestKey: input.requestKey,
          fingerprint,
          name: input.name,
          email: input.email,
          phone: input.phone,
          requestedDate: input.date,
          products: input.products,
          marketingOptIn: consent.optIn,
          marketingConsentAt: consent.optIn ? now : null,
          marketingConsentSource: consent.optIn ? "special_order_form" : null,
          marketingConsentText: consent.text,
          marketingConsentVersion: consent.version,
        })
        .onConflictDoNothing({ target: specialOrderRequests.requestKey })
        .returning();
      if (!saved) {
        const [retry] = await tx
          .select()
          .from(specialOrderRequests)
          .where(eq(specialOrderRequests.requestKey, input.requestKey));
        return verifyRetry(retry, fingerprint);
      }
      if (consent.optIn)
        await recordSpecialOrderMarketingConsent(tx, {
          email: saved.email,
          specialOrderId: saved.id,
          consentAt: now,
        });
      return saved.id;
    }),
  );
}
