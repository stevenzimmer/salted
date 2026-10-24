"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { PickupDatePicker } from "./pickup-date-picker";
import { resolveCart, cartSubtotal } from "@/lib/cart";
import { maximumInventory, validPickupDates } from "@/lib/availability";
import { money, pickupLabel } from "@/lib/format";
import { pickupConfig } from "@/data/pickup-config";

function focusHeading(element: HTMLHeadingElement | null) {
  element?.focus();
}

export function CartDrawer() {
  const {
    items,
    schedule,
    open,
    setOpen,
    setQuantity,
    removeItem,
    restoreFocus,
  } = useCart();
  const [step, setStep] = useState<"bag" | "pickup" | "payment">("bag");
  const [selectedDate, setSelectedDate] = useState<string>();
  const lines = resolveCart(items);
  const subtotal = cartSubtotal(items);
  const dates = validPickupDates(items, schedule);
  const selected = dates.find((date) => date.date === selectedDate);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setStep("bag");
  }

  function close() {
    handleOpenChange(false);
  }

  function continueToPayment() {
    if (
      selected &&
      validPickupDates(items, schedule).some((date) => date.id === selected.id)
    )
      setStep("payment");
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="cart-sheet"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <SheetHeader className="cart-sheet-header">
          <p className="eyebrow">A little happiness, bagged.</p>
          <SheetTitle className="cart-title">
            {step === "bag"
              ? "Your good stuff."
              : step === "pickup"
                ? "Make it a Friday."
                : "Almost at the table."}
          </SheetTitle>
          <SheetDescription>
            {step === "bag"
              ? "Good bread is better when there’s enough to share."
              : "One pickup date for your entire order."}
          </SheetDescription>
        </SheetHeader>
        {lines.length === 0 ? (
          <div className="empty-cart">
            <ShoppingBag size={48} strokeWidth={1} />
            <h3>
              A good bag starts
              <br />
              with good bread.
            </h3>
            <p>Your bag is waiting for something delicious.</p>
            <Link href="/#products" className="button-primary" onClick={close}>
              Find your good stuff <ArrowRight size={18} />
            </Link>
          </div>
        ) : step === "bag" ? (
          <>
            <div className="cart-lines">
              {lines.map((line) => (
                <article
                  className="cart-line"
                  key={`${line.productId}:${line.variantId}`}
                >
                  <Link
                    href={`/products/${line.product.slug}`}
                    onClick={close}
                    className="cart-line-image"
                  >
                    <Image
                      src={line.product.image}
                      alt={line.product.imageAlt}
                      fill
                      unoptimized
                      sizes="90px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3>
                        <Link
                          href={`/products/${line.product.slug}`}
                          onClick={close}
                        >
                          {line.product.name}
                        </Link>
                      </h3>
                      <button
                        className="remove-item"
                        type="button"
                        aria-label={`Remove ${line.product.name}, ${line.variant.label}`}
                        onClick={() =>
                          removeItem(line.productId, line.variantId)
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {line.variant.label} · {money(line.variant.price)} each
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <QuantitySelector
                        label={`${line.product.name} ${line.variant.label} quantity`}
                        value={line.quantity}
                        onChange={(quantity) =>
                          setQuantity(line.productId, line.variantId, quantity)
                        }
                        max={maximumInventory(
                          schedule,
                          line.productId,
                          line.variantId,
                        )}
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
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <p>Pickup date selected at checkout.</p>
              <p className="cart-preview-note">
                Storefront preview · no live payment or order.
              </p>
              <button
                type="button"
                className="button-primary w-full"
                onClick={() => setStep("pickup")}
              >
                Checkout — {money(subtotal)}
                <ArrowRight size={17} />
              </button>
              <button type="button" className="text-button" onClick={close}>
                Keep the good stuff coming
              </button>
            </div>
          </>
        ) : step === "pickup" ? (
          <div className="checkout-scroll" key="pickup">
            <button
              type="button"
              onClick={() => setStep("bag")}
              className="back-link m-0"
            >
              <ArrowLeft size={15} /> Back to your bag
            </button>
            <h3 className="checkout-heading" tabIndex={-1} ref={focusHeading}>
              When do you want
              <br />
              your bread?
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pick a Friday that works for you. Only dates with enough of
              everything in your bag are available.
            </p>
            {dates.length ? (
              <PickupDatePicker
                dates={dates}
                selected={selected?.date}
                onSelect={setSelectedDate}
              />
            ) : (
              <div className="checkout-notice" role="status">
                <h4>No Fridays fit this bag just yet.</h4>
                <p>
                  A product, size, or quantity is unavailable across the
                  upcoming dates. Adjust your bag to find a Friday.
                </p>
                <button
                  type="button"
                  className="inline-link mt-4"
                  onClick={() => setStep("bag")}
                >
                  Edit your bag <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div className="pickup-summary">
              <MapPin size={20} strokeWidth={1.5} />
              <div>
                <strong>
                  {selected ? pickupLabel(selected.date) : pickupConfig.city}
                </strong>
                <p>
                  {pickupConfig.hoursLabel} · {pickupConfig.city}
                </p>
                <p>{pickupConfig.address}</p>
              </div>
            </div>
            {selected ? (
              <p className="cutoff-note">
                Orders close{" "}
                {new Date(selected.orderCutoff).toLocaleDateString("en-US", {
                  timeZone: pickupConfig.timezone,
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at 11:59 pm Pacific.
              </p>
            ) : null}
            <div className="subtotal-row mt-7">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <button
              type="button"
              className="button-primary mt-5 w-full"
              disabled={!selected}
              onClick={continueToPayment}
            >
              Continue to payment <ArrowRight size={17} />
            </button>
            <p className="draft-note mt-4 text-center">
              Preview only. Payment is coming in a later phase.
            </p>
          </div>
        ) : (
          <div className="checkout-scroll payment-preview" key="payment">
            <span className="confirmation-icon">
              <Check size={30} strokeWidth={1.3} />
            </span>
            <h3 className="checkout-heading" tabIndex={-1} ref={focusHeading}>
              Your Friday looks good.
            </h3>
            <p className="text-sm leading-relaxed">
              This is where secure payment will happen. You won’t be charged and
              no order has been placed in this preview.
            </p>
            {selected ? (
              <div className="payment-details">
                <p className="eyebrow">One pickup for your whole bag</p>
                <strong>{pickupLabel(selected.date)}</strong>
                <p>
                  {pickupConfig.hoursLabel} · {pickupConfig.city}
                </p>
                <div className="subtotal-row mt-5">
                  <span>Product subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <p className="draft-note mt-3">
                  Final tax treatment will be confirmed before checkout
                  launches.
                </p>
              </div>
            ) : (
              <p role="alert">
                Your date is no longer available. Please choose another Friday.
              </p>
            )}
            <Link
              href={
                selected
                  ? `/order/success?pickup=${selected.date}`
                  : "/order/success"
              }
              onClick={close}
              className="button-primary mt-6 w-full"
            >
              Preview the confirmation <ArrowUpRight size={17} />
            </Link>
            <button
              type="button"
              className="text-button"
              onClick={() => setStep("pickup")}
            >
              Back to pickup dates
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
