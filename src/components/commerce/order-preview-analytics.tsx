"use client";

import { useEffect, useRef } from "react";
import { trackCheckoutEvent } from "@/lib/analytics";

export function OrderPreviewAnalytics({
  hasValidPickupDate,
}: {
  hasValidPickupDate: boolean;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackCheckoutEvent("order_preview_view", {
      has_valid_pickup_date: hasValidPickupDate,
    });
  }, [hasValidPickupDate]);

  return null;
}
