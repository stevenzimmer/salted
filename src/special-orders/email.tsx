import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { render } from "react-email";
import { withDatabase } from "../db/client";
import { specialOrderRequests } from "../db/schema";
import { emailPayloadInput, sendTransactionalEmail } from "../commerce/email";
import { fetchSpecialOrderPage } from "../commerce/catalog";
import { SpecialOrderNotificationEmail } from "../emails/special-order-notification";

type Dependencies = {
  database?: typeof withDatabase;
  copy?: typeof fetchSpecialOrderPage;
  send?: typeof sendTransactionalEmail;
};

export async function deliverSpecialOrderNotification(
  id: string,
  dependencies: Dependencies = {},
): Promise<void> {
  const database = dependencies.database ?? withDatabase;
  const [request] = await database((db) =>
    db
      .select()
      .from(specialOrderRequests)
      .where(eq(specialOrderRequests.id, id)),
  );
  if (!request || request.notificationStatus === "sent") return;
  if (request.notificationStatus === "review")
    throw new Error("Notification needs operator review.");
  if (!dependencies.send && !process.env.RESEND_API_KEY)
    throw new Error("Transactional email is not configured.");
  let payload = request.notificationPayload;
  if (!payload) {
    const page = await (dependencies.copy ?? fetchSpecialOrderPage)();
    const template = (
      <SpecialOrderNotificationEmail
        request={request}
        copy={page?.notificationEmail}
      />
    );
    payload = emailPayloadInput.parse({
      from: process.env.EMAIL_FROM ?? "feedme@saltedfocaccia.com",
      to: "feedme@saltedfocaccia.com",
      replyTo: request.email,
      subject: `${page?.notificationEmail?.subject?.trim() ? `${page.notificationEmail.subject.trim()} · ` : ""}${request.id}`,
      html: await render(template),
      text: await render(template, { plainText: true }),
    });
  }
  const claim = await database((db) =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(specialOrderRequests)
        .where(eq(specialOrderRequests.id, id))
        .for("update");
      if (!row || row.notificationStatus === "sent") return null;
      const now = new Date();
      if (
        row.notificationStatus === "review" ||
        (row.firstAttemptAt &&
          now.getTime() - row.firstAttemptAt.getTime() >= 23 * 60 * 60_000)
      ) {
        await tx
          .update(specialOrderRequests)
          .set({
            notificationStatus: "review",
            leaseId: null,
            leaseUntil: null,
            updatedAt: now,
          })
          .where(eq(specialOrderRequests.id, id));
        return { review: true } as const;
      }
      if (row.leaseUntil && row.leaseUntil > now)
        throw new Error("Notification already sending.");
      const leaseId = randomUUID();
      const [claimed] = await tx
        .update(specialOrderRequests)
        .set({
          notificationStatus: "sending",
          notificationPayload: row.notificationPayload ?? payload,
          firstAttemptAt: row.firstAttemptAt ?? now,
          leaseId,
          leaseUntil: new Date(now.getTime() + 60_000),
          updatedAt: now,
        })
        .where(eq(specialOrderRequests.id, id))
        .returning();
      return {
        review: false,
        leaseId,
        payload: emailPayloadInput.parse(claimed.notificationPayload),
      } as const;
    }),
  );
  if (!claim) return;
  if (claim.review) throw new Error("Notification needs operator review.");
  try {
    const providerId = await (dependencies.send ?? sendTransactionalEmail)(
      claim.payload,
      `salted-special-order/${id}`,
    );
    const updated = await database((db) =>
      db
        .update(specialOrderRequests)
        .set({
          notificationStatus: "sent",
          providerId,
          sentAt: new Date(),
          leaseId: null,
          leaseUntil: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(specialOrderRequests.id, id),
            eq(specialOrderRequests.leaseId, claim.leaseId),
          ),
        )
        .returning({ id: specialOrderRequests.id }),
    );
    if (!updated.length)
      throw new Error("Notification delivery lease changed.");
  } catch {
    await database((db) =>
      db
        .update(specialOrderRequests)
        .set({
          notificationStatus: "pending",
          leaseId: null,
          leaseUntil: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(specialOrderRequests.id, id),
            eq(specialOrderRequests.leaseId, claim.leaseId),
          ),
        ),
    );
    throw new Error("Special-order notification pending; retry privately.");
  }
}

export async function retrySpecialOrderNotifications() {
  const pending = await withDatabase((db) =>
    db
      .select({ id: specialOrderRequests.id })
      .from(specialOrderRequests)
      .where(
        inArray(specialOrderRequests.notificationStatus, [
          "pending",
          "sending",
        ]),
      )
      .limit(25),
  );
  let sent = 0,
    failed = 0;
  for (const row of pending) {
    try {
      await deliverSpecialOrderNotification(row.id);
      sent++;
    } catch {
      failed++;
    }
  }
  const [review] = await withDatabase((db) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(specialOrderRequests)
      .where(eq(specialOrderRequests.notificationStatus, "review")),
  );
  return { sent, failed, needsReview: review.count };
}
