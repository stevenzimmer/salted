import { timingSafeEqual } from "node:crypto";
import { deliverPickupReminders } from "./pickup-reminders";

export async function handlePickupReminderCron(
  request: Request,
  run = deliverPickupReminders,
): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const headers = { "Cache-Control": "private, no-store" };
  if (!secret || secret.length < 32)
    return Response.json(
      { error: "Reminder scheduler is not configured." },
      { status: 503, headers },
    );
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (
    process.env.PICKUP_REMINDERS_ENABLED !== "true" ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
  )
    return Response.json({ skipped: true, reason: "disabled" }, { headers });
  try {
    const result = await run();
    return Response.json(result, {
      status:
        result.failed || result.remaining || result.needsReview ? 503 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Pickup reminder delivery incomplete." },
      { status: 503, headers },
    );
  }
}
