import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Text } from "@/components/cms/text";
import { money, pickupLabel, pickupWindowLabel } from "@/lib/format";
import { getGlobalContent } from "@/sanity/lib/data";
import { clean, hasText } from "@/sanity/lib/content";
import { ownerCapability } from "@/commerce/http";
import { orderConfirmation } from "@/commerce/confirmation";
import { ConfirmationRefresh } from "@/components/commerce/confirmation-refresh";
import { VerifiedCartClear } from "@/components/commerce/verified-cart-clear";
export async function generateMetadata() {
  const { commerce } = await getGlobalContent();
  return {
    title: clean(commerce?.confirmation?.seoTitle),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const [{ session_id }, { settings, commerce }, owner] = await Promise.all([
    searchParams,
    getGlobalContent(),
    ownerCapability(),
  ]);
  let order = null;
  try {
    order = await orderConfirmation(session_id, owner?.ownerHash);
  } catch {
    /* A missing service must never render a paid confirmation. */
  }
  const copy = commerce?.checkout;
  const heading = order?.paid
    ? copy?.paidHeading
    : order?.ended || !order
      ? copy?.unavailableHeading
      : copy?.pendingHeading;
  const body = order?.paid
    ? copy?.paidBody
    : order?.ended || !order
      ? copy?.unavailableBody
      : copy?.pendingBody;
  return (
    <div className="shell confirmation-page">
      <LogoMark settings={settings} />
      <Text className="eyebrow mt-8" value={commerce?.confirmation?.eyebrow} />
      <Text as="h1" className="whitespace-pre-line" value={heading} />
      <Text className="page-description" value={body} />
      {order?.paid ? (
        <>
          <VerifiedCartClear orderNumber={order.number} items={order.items} />
          <div className="confirmation-details">
            <p className="eyebrow">{order.number}</p>
            <Text as="h2" value={pickupLabel(order.pickup.date)} />
            <p>
              {pickupWindowLabel(order.pickup.startTime, order.pickup.endTime)}
            </p>
            <ul className="my-5 space-y-3">
              {order.items.map((i) => (
                <li key={`${i.productId}:${i.variantId}`}>
                  {i.quantity} × {i.name} / {i.variant} — {money(i.lineTotal)}
                </li>
              ))}
            </ul>
            <p className="font-medium">{money(order.total)}</p>
            <Text className="mt-4 text-sm" value={copy?.pickupGuidance} />
            {hasText(copy?.storageLink) ? (
              <Link href="/storage-heating" className="inline-link mt-4">
                {copy.storageLink}
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
      {order && !order.paid && !order.ended ? (
        <ConfirmationRefresh label={copy?.refresh} />
      ) : null}
      {hasText(commerce?.confirmation?.cta) ? (
        <Link className="button-primary mt-8" href="/#products">
          {commerce.confirmation.cta}
          <ArrowUpRight size={17} />
        </Link>
      ) : null}
    </div>
  );
}
