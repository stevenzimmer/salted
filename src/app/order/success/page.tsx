import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { pickupLabel } from "@/lib/format";
import { pickupConfig } from "@/data/pickup-config";
import { getMockSchedule } from "@/data/product-availability";
import { isPickupOpen } from "@/lib/availability";
import { OrderPreviewAnalytics } from "@/components/commerce/order-preview-analytics";

export const metadata: Metadata = {
  title: "Confirmation preview",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ pickup?: string }>;
}) {
  const { pickup } = await searchParams;
  const date = getMockSchedule().dates.find(
    (date) => date.date === pickup && isPickupOpen(date),
  );
  return (
    <div className="shell confirmation-page">
      <OrderPreviewAnalytics hasValidPickupDate={Boolean(date)} />
      <LogoMark />
      <p className="eyebrow mt-8">A taste of what’s next</p>
      <h1>
        Good things
        <br />
        are on the way.
      </h1>
      <p className="page-description">
        This is a sample confirmation. No order has been placed, no payment was
        taken, and your bag is still here.
      </p>
      <div className="confirmation-details">
        <p className="eyebrow">Your preview pickup</p>
        <h2>{date ? pickupLabel(date.date) : "Your chosen Friday"}</h2>
        <p>
          {pickupConfig.hoursLabel} · {pickupConfig.city}
        </p>
        <p className="mt-4 text-sm">
          The exact address will be shared after a future completed purchase.
        </p>
      </div>
      <p className="draft-note max-w-md">
        Thanks for taking a little look around. We can’t wait to share the real
        good stuff with you.
      </p>
      <Link className="button-primary mt-8" href="/#products">
        Back to the good stuff <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
