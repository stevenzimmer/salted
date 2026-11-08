import { createClient } from "@sanity/client";
async function main() {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2026-02-01",
    token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
    useCdn: false,
  });
  if (!process.env.SANITY_API_WRITE_TOKEN && !process.env.SANITY_API_TOKEN)
    throw new Error(
      "A server-only Sanity write token is required for this one-time migration.",
    );
  const checkout = {
    pay: "Continue to Stripe",
    busy: "Preparing checkout…",
    priceChanged:
      "A price in your bag has changed. Review the current prices before payment.",
    review: "I have reviewed these prices",
    refresh: "Check payment status",
    pendingHeading: "Confirming your payment",
    pendingBody:
      "Your payment confirmation is still processing. Check again shortly. Your bag will stay saved until payment is verified.",
    paidHeading: "Your order is confirmed",
    paidBody: "Thank you. Your Friday pickup order is confirmed.",
    unavailableHeading: "Order confirmation unavailable",
    unavailableBody:
      "We could not verify a completed order in this browser. If you paid, contact the bakery before trying another payment.",
    pickupGuidance:
      "Pickup street address and arrival instructions are awaiting bakery confirmation. Contact the bakery for guidance before pickup.",
    storageLink: "Storage & reheating instructions",
    cancel: "End my previous checkout",
    resume: "Resume checkout",
  };
  for (const id of ["commerceCopy", "drafts.commerceCopy"]) {
    const doc = await client.getDocument(id);
    if (doc && !("checkout" in doc))
      await client.patch(id).setIfMissing({ checkout }).commit();
  }
  console.log(
    "Initialized missing Phase 3 operational copy only; existing editorial fields and drafts preserved. Review pickup guidance before live launch.",
  );
}
void main().catch(() => {
  console.error(
    "Commerce operation failed; check credentials and connectivity.",
  );
  process.exitCode = 1;
});
