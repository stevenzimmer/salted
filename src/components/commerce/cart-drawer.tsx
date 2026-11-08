"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CmsImage } from "@/components/cms/image";
import { Text } from "@/components/cms/text";
import { hasText, hasImage, clean, interpolate } from "@/sanity/lib/content";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ShoppingBag,
  MapPin,
  Check,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCart } from "./cart-provider";
import { QuantitySelector } from "./quantity-selector";
import { CheckoutPayment } from "./checkout-payment";
import { CheckoutReturn } from "./checkout-return";
import { PickupDatePicker } from "./pickup-date-picker";
import { resolveCart, cartSubtotal } from "@/lib/cart";
import { validPickupDates } from "@/lib/availability";
import { money, pickupLabel } from "@/lib/format";
import { pickupConfig } from "@/data/pickup-config";
import { trackCheckoutEvent, type CheckoutStep } from "@/lib/analytics";

function focusHeading(element: HTMLHeadingElement | null) {
  element?.focus();
}

export function CartDrawer() {
  const {
    items,
    commerceEnabled,
    products,
    commerce,
    schedule,
    open,
    setOpen,
    setQuantity,
    removeItem,
    restoreFocus,
  } = useCart();
  const [step, setStep] = useState<CheckoutStep>("bag");
  const [selectedDate, setSelectedDate] = useState<string>();
  const lines = resolveCart(items, products);
  const subtotal = cartSubtotal(items, products);
  const dates = validPickupDates(items, schedule);
  const selected = dates.find((date) => date.date === selectedDate);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const visibleStep = items.length === 0 ? "bag" : step;
  const lastViewedStep = useRef<CheckoutStep | null>(null);
  const wasUnavailable = useRef(false);

  // Synchronize analytics with the visible drawer, including cross-tab cart
  // changes. Refs prevent duplicate views on rerenders and Strict Mode replay.
  useEffect(() => {
    if (!open) {
      lastViewedStep.current = null;
      wasUnavailable.current = false;
      return;
    }

    if (lastViewedStep.current !== visibleStep) {
      trackCheckoutEvent("checkout_step_view", {
        step_name: visibleStep,
        item_count: itemCount,
        available_date_count: dates.length,
      });
      lastViewedStep.current = visibleStep;
    }

    const unavailable = visibleStep === "pickup" && dates.length === 0;
    if (unavailable && !wasUnavailable.current) {
      trackCheckoutEvent("pickup_dates_unavailable", {
        step_name: "pickup",
        item_count: itemCount,
        available_date_count: 0,
      });
    }
    wasUnavailable.current = unavailable;
  }, [open, visibleStep, itemCount, dates.length]);

  function handleOpenChange(next: boolean) {
    if (!next && open) {
      trackCheckoutEvent("checkout_closed", {
        step_name: visibleStep,
        item_count: itemCount,
      });
    }
    setOpen(next);
    if (!next) setStep("bag");
  }

  function close() {
    handleOpenChange(false);
  }

  function closeForNavigation() {
    setOpen(false);
    setStep("bag");
  }

  function goBack(toStep: CheckoutStep) {
    trackCheckoutEvent("checkout_back", {
      from_step: visibleStep,
      to_step: toStep,
      item_count: itemCount,
    });
    setStep(toStep);
  }

  function backToBag() {
    goBack("bag");
  }

  function backToPickup() {
    goBack("pickup");
  }

  function selectPickupDate(date: string | undefined) {
    setSelectedDate(date);
    if (
      date &&
      date !== selected?.date &&
      dates.some((option) => option.date === date)
    ) {
      trackCheckoutEvent("pickup_date_selected", {
        pickup_date: date,
        item_count: itemCount,
        available_date_count: dates.length,
      });
    }
  }

  function continueToPayment() {
    if (
      selected &&
      validPickupDates(items, schedule).some((date) => date.id === selected.id)
    )
      setStep("payment_preview");
  }

  const c = commerce?.cart;
  const heading =
    visibleStep === "bag"
      ? c?.bagHeading
      : visibleStep === "pickup"
        ? c?.pickupHeading
        : c?.paymentHeading;
  const description =
    visibleStep === "bag" ? c?.bagDescription : c?.pickupDescription;
  const visibleHeader = [c?.eyebrow, heading, description].some(hasText);
  const location = hasText(c?.city) || hasText(c?.hours) || hasText(c?.address);
  const locationLine = (
    <>
      {hasText(c?.hours) ? c.hours : null}
      {hasText(c?.hours) && hasText(c?.city) ? " · " : null}
      {hasText(c?.city) ? c.city : null}
    </>
  );
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="cart-sheet"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <SheetHeader
          className={visibleHeader ? "cart-sheet-header" : "sr-only"}
        >
          <Text className="eyebrow" value={c?.eyebrow} />
          <SheetTitle className={hasText(heading) ? "cart-title" : "sr-only"}>
            {hasText(heading) ? heading : "Cart"}
          </SheetTitle>
          <SheetDescription
            className={hasText(description) ? undefined : "sr-only"}
          >
            {hasText(description) ? description : "Order preview"}
          </SheetDescription>
        </SheetHeader>
        {items.length === 0 ? (
          [c?.emptyHeading, c?.emptyBody, c?.emptyCta].some(hasText) ? (
            <div className="empty-cart">
              <ShoppingBag size={48} strokeWidth={1} aria-hidden="true" />
              <Text
                as="h3"
                className="whitespace-pre-line"
                value={c?.emptyHeading}
              />
              <Text value={c?.emptyBody} />
              {hasText(c?.emptyCta) ? (
                <Link
                  href="/#products"
                  className="button-primary"
                  onClick={closeForNavigation}
                >
                  {c.emptyCta}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          ) : null
        ) : step === "bag" ? (
          <>
            <CheckoutReturn />
            {items.length !== lines.length ? (
              <div className="checkout-notice" role="alert">
                Some items are no longer available. Remove them to continue.
                {items
                  .filter(
                    (item) =>
                      !lines.some(
                        (l) =>
                          l.productId === item.productId &&
                          l.variantId === item.variantId,
                      ),
                  )
                  .map((item) => (
                    <button
                      type="button"
                      className="text-button"
                      key={`${item.productId}:${item.variantId}`}
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      Remove {item.productId} / {item.variantId}
                    </button>
                  ))}
              </div>
            ) : null}
            <div className="cart-lines">
              {lines.map((line) => (
                <article
                  className="cart-line"
                  key={`${line.productId}:${line.variantId}`}
                >
                  {hasImage(line.product.image) ? (
                    <Link
                      href={`/products/${line.product.slug}`}
                      onClick={closeForNavigation}
                      className="cart-line-image"
                      aria-label={`View ${clean(line.product.name) || "product"}`}
                    >
                      <CmsImage
                        image={line.product.image}
                        aspectRatio={84 / 108}
                        documentType={line.product._type}
                        documentId={line.product._id}
                        path="image"
                        sizes="90px"
                      />
                    </Link>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      {hasText(line.product.name) ? (
                        <h3>
                          <Link
                            href={`/products/${line.product.slug}`}
                            onClick={closeForNavigation}
                          >
                            {line.product.name}
                          </Link>
                        </h3>
                      ) : null}
                      <button
                        className="remove-item"
                        type="button"
                        aria-label={`Remove ${clean(line.product.name) || "product"}, ${clean(line.variant.label)}`}
                        onClick={() =>
                          removeItem(line.productId, line.variantId)
                        }
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.variant.label} · {money(line.variant.price)}{" "}
                      <Text as="span" value={c?.each} />
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <QuantitySelector
                        label={`${clean(line.product.name)} ${clean(line.variant.label)} quantity`}
                        value={line.quantity}
                        onChange={(quantity) =>
                          setQuantity(line.productId, line.variantId, quantity)
                        }
                      />
                      <span className="text-sm font-medium">
                        {money(line.lineTotal)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <div className="subtotal-row">
                <Text as="span" value={c?.subtotal} />
                <span>{money(subtotal)}</span>
              </div>
              <Text value={c?.pickupHelper} />
              {!commerceEnabled ? (
                <Text className="cart-preview-note" value={c?.previewNote} />
              ) : null}
              {hasText(c?.checkout) ? (
                <button
                  type="button"
                  className="button-primary w-full"
                  onClick={() => setStep("pickup")}
                >
                  {c.checkout} — {money(subtotal)}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              ) : null}
              {hasText(c?.keepShopping) ? (
                <button type="button" className="text-button" onClick={close}>
                  {c.keepShopping}
                </button>
              ) : null}
            </div>
          </>
        ) : step === "pickup" ? (
          <div className="checkout-scroll" key="pickup">
            {hasText(c?.backToBag) ? (
              <button
                type="button"
                onClick={backToBag}
                className="back-link m-0"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                {c.backToBag}
              </button>
            ) : null}
            <h3
              className={
                hasText(c?.dateHeading)
                  ? "checkout-heading whitespace-pre-line"
                  : "sr-only"
              }
              tabIndex={-1}
              ref={focusHeading}
            >
              {hasText(c?.dateHeading) ? c.dateHeading : "Pickup date"}
            </h3>
            <Text
              className="text-sm leading-relaxed text-muted-foreground"
              value={c?.dateIntro}
            />
            {dates.length ? (
              <PickupDatePicker
                dates={dates}
                selected={selected?.date}
                onSelect={selectPickupDate}
                legend={c?.calendarKey}
              />
            ) : [c?.unavailableHeading, c?.unavailableBody, c?.editBag].some(
                hasText,
              ) ? (
              <div className="checkout-notice" role="status">
                <Text as="h4" value={c?.unavailableHeading} />
                <Text value={c?.unavailableBody} />
                {hasText(c?.editBag) ? (
                  <button
                    type="button"
                    className="inline-link mt-4"
                    onClick={backToBag}
                  >
                    {c.editBag}
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
            {location || selected ? (
              <div className="pickup-summary">
                <MapPin size={20} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <Text
                    as="strong"
                    value={selected ? pickupLabel(selected.date) : c?.city}
                  />
                  {hasText(c?.city) || hasText(c?.hours) ? (
                    <p>{locationLine}</p>
                  ) : null}
                  <Text
                    value={
                      commerceEnabled
                        ? commerce?.checkout?.pickupGuidance
                        : c?.address
                    }
                  />
                </div>
              </div>
            ) : null}
            {selected ? (
              <Text
                className="cutoff-note"
                value={interpolate(c?.cutoff, {
                  date: new Date(selected.orderCutoff).toLocaleDateString(
                    "en-US",
                    {
                      timeZone: pickupConfig.timezone,
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    },
                  ),
                })}
              />
            ) : null}
            <div className="subtotal-row mt-7">
              <Text as="span" value={c?.subtotal} />
              <span>{money(subtotal)}</span>
            </div>
            {commerceEnabled && selected ? (
              <CheckoutPayment
                key={JSON.stringify({ items, date: selected.date })}
                pickupDate={selected.date}
              />
            ) : null}
            {!commerceEnabled && hasText(c?.continue) ? (
              <button
                type="button"
                className="button-primary mt-5 w-full"
                disabled={!selected}
                onClick={continueToPayment}
              >
                {c.continue}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : null}
            <Text
              className="draft-note mt-4 text-center"
              value={commerceEnabled ? undefined : c?.paymentNote}
            />
          </div>
        ) : (
          <div className="checkout-scroll payment-preview" key="payment">
            {[c?.paymentPreviewHeading, c?.paymentPreviewBody].some(hasText) ? (
              <span className="confirmation-icon">
                <Check size={30} strokeWidth={1.3} aria-hidden="true" />
              </span>
            ) : null}
            <h3
              className={
                hasText(c?.paymentPreviewHeading)
                  ? "checkout-heading"
                  : "sr-only"
              }
              tabIndex={-1}
              ref={focusHeading}
            >
              {hasText(c?.paymentPreviewHeading)
                ? c.paymentPreviewHeading
                : "Payment preview"}
            </h3>
            <Text
              className="text-sm leading-relaxed"
              value={c?.paymentPreviewBody}
            />
            {selected ? (
              <div className="payment-details">
                <Text className="eyebrow" value={c?.paymentPickupLabel} />
                <strong>{pickupLabel(selected.date)}</strong>
                {hasText(c?.city) || hasText(c?.hours) ? (
                  <p>{locationLine}</p>
                ) : null}
                <div className="subtotal-row mt-5">
                  <Text as="span" value={c?.productSubtotal} />
                  <span>{money(subtotal)}</span>
                </div>
                <Text className="draft-note mt-3" value={c?.taxNote} />
              </div>
            ) : (
              <Text role="alert" value={c?.expiredDate} />
            )}
            {hasText(c?.confirmation) ? (
              <Link
                href={
                  selected
                    ? `/order/success?pickup=${selected.date}`
                    : "/order/success"
                }
                onClick={closeForNavigation}
                className="button-primary mt-6 w-full"
              >
                {c.confirmation}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            ) : null}
            {hasText(c?.backToDates) ? (
              <button
                type="button"
                className="text-button"
                onClick={backToPickup}
              >
                {c.backToDates}
              </button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
