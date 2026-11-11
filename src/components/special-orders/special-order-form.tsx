"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spark } from "@/components/brand/spark";
import {
  minimumSpecialOrderDate,
  validateSpecialOrder,
  type SpecialOrderErrors,
  type SpecialOrderInput,
} from "@/lib/special-orders";

import type { SpecialOrdersPage } from "../../../sanity.types";
import { hasText, clean, interpolate } from "@/sanity/lib/content";
import { Text } from "@/components/cms/text";
import { specialOrderConfig } from "@/data/special-order-config";

const initial: SpecialOrderInput = {
  name: "",
  email: "",
  phone: "",
  date: "",
  products: "",
  quantity: "",
  eventType: "",
  notes: "",
};

export function SpecialOrderForm({
  copy,
  validation,
}: {
  copy?: SpecialOrdersPage["form"];
  validation?: SpecialOrdersPage["validation"];
}) {
  const [errors, setErrors] = useState<SpecialOrderErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      Object.keys(initial).map((key) => [key, String(data.get(key) ?? "")]),
    ) as SpecialOrderInput;
    const nextErrors = validateSpecialOrder(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${first}"]`)
        ?.focus();
      return;
    }
    setSubmitted(true);
  }

  function errorFor(name: keyof SpecialOrderInput) {
    return errors[name] && hasText(validation?.[errors[name]]) ? (
      <p className="form-error" id={`${name}-error`}>
        {interpolate(validation?.[errors[name]], {
          days: specialOrderConfig.leadTimeDays,
        })}
      </p>
    ) : null;
  }

  if (submitted) {
    if (
      ![
        copy?.successEyebrow,
        copy?.successHeading,
        copy?.successBody,
        copy?.successNote,
        copy?.restart,
      ].some(hasText)
    )
      return null;
    return (
      <div
        className="special-success"
        role="status"
        tabIndex={-1}
        ref={(element) => element?.focus()}
      >
        <span className="confirmation-icon">
          <Check size={30} aria-hidden="true" />
        </span>
        <Text className="eyebrow mt-7" value={copy?.successEyebrow} />
        <Text
          as="h2"
          className="whitespace-pre-line"
          value={copy?.successHeading}
        />
        <Text value={copy?.successBody} />
        <Text value={copy?.successNote} />
        {hasText(copy?.restart) ? (
          <button
            type="button"
            className="button-outline mt-7"
            onClick={() => setSubmitted(false)}
          >
            {copy.restart}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form className="special-order-form" onSubmit={handleSubmit} noValidate>
      <Text as="h2" value={copy?.heading} />
      <Text value={copy?.intro} />
      <div className="form-grid">
        <div className="form-field">
          <label
            htmlFor="name"
            className={hasText(copy?.nameLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.nameLabel) ? copy?.nameLabel : "Name"}
            {hasText(copy?.nameLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder={clean(copy?.namePlaceholder)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name && hasText(validation?.[errors.name])
                ? "name-error"
                : undefined
            }
          />
          {errorFor("name")}
        </div>
        <div className="form-field">
          <label
            htmlFor="email"
            className={hasText(copy?.emailLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.emailLabel) ? copy?.emailLabel : "Email address"}
            {hasText(copy?.emailLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder={clean(copy?.emailPlaceholder)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email && hasText(validation?.[errors.email])
                ? "email-error"
                : undefined
            }
          />
          {errorFor("email")}
        </div>
        <div className="form-field">
          <label
            htmlFor="phone"
            className={hasText(copy?.phoneLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.phoneLabel) ? copy?.phoneLabel : "Phone number"}
            {hasText(copy?.phoneLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={30}
            placeholder={clean(copy?.phonePlaceholder)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone && hasText(validation?.[errors.phone])
                ? "phone-error"
                : undefined
            }
          />
          {errorFor("phone")}
        </div>
        <div className="form-field">
          <label
            htmlFor="date"
            className={hasText(copy?.dateLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.dateLabel) ? copy?.dateLabel : "Requested date"}
            {hasText(copy?.dateLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Input
            id="date"
            name="date"
            type="date"
            min={minimumSpecialOrderDate()}
            required
            aria-invalid={Boolean(errors.date)}
            aria-describedby={
              errors.date && hasText(validation?.[errors.date])
                ? "date-error"
                : undefined
            }
          />
          {errorFor("date")}
        </div>
        <div className="form-field col-span-full">
          <label
            htmlFor="products"
            className={hasText(copy?.productsLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.productsLabel)
              ? copy?.productsLabel
              : "Requested products"}
            {hasText(copy?.productsLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Textarea
            id="products"
            name="products"
            required
            maxLength={3000}
            rows={4}
            placeholder={clean(copy?.productsPlaceholder)}
            aria-invalid={Boolean(errors.products)}
            aria-describedby={
              errors.products && hasText(validation?.[errors.products])
                ? "products-error"
                : undefined
            }
          />
          {errorFor("products")}
        </div>
        <div className="form-field">
          <label
            htmlFor="quantity"
            className={hasText(copy?.quantityLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.quantityLabel)
              ? copy?.quantityLabel
              : "Approximate quantity"}
            {hasText(copy?.quantityLabel) ? (
              <Spark className="required-spark" />
            ) : null}
          </label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={1000}
            required
            placeholder={clean(copy?.quantityPlaceholder)}
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={
              errors.quantity && hasText(validation?.[errors.quantity])
                ? "quantity-error"
                : undefined
            }
          />
          {errorFor("quantity")}
        </div>
        <div className="form-field">
          <label
            htmlFor="eventType"
            className={hasText(copy?.eventTypeLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.eventTypeLabel)
              ? copy?.eventTypeLabel
              : "Event type"}
            {hasText(copy?.eventTypeLabel) ? (
              <>
                <Text as="span" className="optional" value={copy?.optional} />
              </>
            ) : null}
          </label>
          <Input
            id="eventType"
            name="eventType"
            maxLength={150}
            placeholder={clean(copy?.eventTypePlaceholder)}
          />
        </div>
        <div className="form-field col-span-full">
          <label
            htmlFor="notes"
            className={hasText(copy?.notesLabel) ? undefined : "sr-only"}
          >
            {hasText(copy?.notesLabel) ? copy?.notesLabel : "Additional notes"}
            {hasText(copy?.notesLabel) ? (
              <>
                <Text as="span" className="optional" value={copy?.optional} />
              </>
            ) : null}
          </label>
          <Textarea
            id="notes"
            name="notes"
            maxLength={3000}
            rows={3}
            placeholder={clean(copy?.notesPlaceholder)}
          />
        </div>
      </div>
      {hasText(copy?.disclaimer) || hasText(copy?.submit) ? (
        <div className="form-bottom">
          <Text value={copy?.disclaimer} />
          {hasText(copy?.submit) ? (
            <button type="submit" className="button-primary">
              {copy.submit}
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      <Text className="draft-note mt-5" value={copy?.note} />
    </form>
  );
}
