import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { Text } from "@/components/cms/text";
import { pickupLabel } from "@/lib/format";
import { getMockSchedule } from "@/data/product-availability";
import { isPickupOpen } from "@/lib/availability";
import { OrderPreviewAnalytics } from "@/components/commerce/order-preview-analytics";
import { getGlobalContent } from "@/sanity/lib/data";
import { clean, hasText } from "@/sanity/lib/content";
export async function generateMetadata() {
  const { commerce } = await getGlobalContent();
  return {
    title: clean(commerce?.confirmation?.seoTitle),
    robots: { index: false, follow: false },
  };
}
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ pickup?: string }>;
}) {
  const [{ pickup }, { settings, commerce }] = await Promise.all([
    searchParams,
    getGlobalContent(),
  ]);
  const date = getMockSchedule().dates.find(
    (date) => date.date === pickup && isPickupOpen(date),
  );
  const c = commerce?.confirmation,
    cart = commerce?.cart;
  const details =
    [c?.pickupLabel, c?.chosenDate, c?.address, cart?.city, cart?.hours].some(
      hasText,
    ) || date;
  return (
    <div className="shell confirmation-page">
      <OrderPreviewAnalytics hasValidPickupDate={Boolean(date)} />
      <LogoMark settings={settings} />
      <Text className="eyebrow mt-8" value={c?.eyebrow} />
      <Text as="h1" className="whitespace-pre-line" value={c?.heading} />
      <Text className="page-description" value={c?.body} />
      {details ? (
        <div className="confirmation-details">
          <Text className="eyebrow" value={c?.pickupLabel} />
          <Text as="h2" value={date ? pickupLabel(date.date) : c?.chosenDate} />
          {hasText(cart?.city) || hasText(cart?.hours) ? (
            <p>
              {cart?.hours}
              {hasText(cart?.hours) && hasText(cart?.city) ? " · " : null}
              {cart?.city}
            </p>
          ) : null}
          <Text className="mt-4 text-sm" value={c?.address} />
        </div>
      ) : null}
      <Text className="draft-note max-w-md" value={c?.note} />
      {hasText(c?.cta) ? (
        <Link className="button-primary mt-8" href="/#products">
          {c.cta}
          <ArrowUpRight size={17} />
        </Link>
      ) : null}
    </div>
  );
}
