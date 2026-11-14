"use client";

import { useRef, useState, type FormEvent } from "react";
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
import { MarketingConsentCheckbox } from "@/components/commerce/marketing-consent-checkbox";
import { specialOrderConfig } from "@/data/special-order-config";

const initial: SpecialOrderInput = {
  name: "",
  email: "",
  phone: "",
  date: "",
  products: "",
};

export function SpecialOrderForm({
  copy,
  validation,
  marketingConsentLabel,
}: {
  copy?: SpecialOrdersPage["form"];
  validation?: SpecialOrdersPage["validation"];
  marketingConsentLabel?: string | null;
}) {
  const [errors, setErrors] = useState<SpecialOrderErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submissionError, setSubmissionError] = useState<
    "submitError" | "rateLimited" | "consentChanged" | null
  >(null);
  const submitting = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmissionError(null);
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
    const optedIn = marketingOptIn && hasText(marketingConsentLabel);
    const details = {
      ...input,
      marketingOptIn: optedIn,
      ...(optedIn
        ? { marketingConsentText: clean(marketingConsentLabel).trim() }
        : {}),
    };
    const signature = JSON.stringify(details);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    submitting.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/special-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, requestKey: attempt.current.key }),
      });
      const result: unknown = await response.json();
      const code =
        result && typeof result === "object" && "code" in result
          ? result.code
          : null;
      if (!response.ok || code !== "submitted") {
        setSubmissionError(
          code === "rate_limited"
            ? "rateLimited"
            : code === "marketing_consent_changed"
              ? "consentChanged"
              : "submitError",
        );
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmissionError("submitError");
    } finally {
      submitting.current = false;
      setPending(false);
    }
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
            onClick={() => {
              attempt.current = null;
              setMarketingOptIn(false);
              setSubmitted(false);
            }}
          >
            {copy.restart}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="special-order-form"
      onSubmit={handleSubmit}
      aria-busy={pending}
      noValidate
    >
      <Text as="h2" value={copy?.heading} />
      <Text value={copy?.intro} />
      <fieldset disabled={pending} className="contents">
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
            <Text
              id="products-description"
              className="mb-3 text-sm leading-relaxed text-muted-foreground"
              value={copy?.productsDescription}
            />
            <Textarea
              id="products"
              name="products"
              required
              maxLength={3000}
              rows={6}
              className="field-sizing-fixed"
              placeholder={clean(copy?.productsPlaceholder)}
              aria-invalid={Boolean(errors.products)}
              aria-describedby={
                [
                  hasText(copy?.productsDescription) && "products-description",
                  errors.products &&
                    hasText(validation?.[errors.products]) &&
                    "products-error",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            {errorFor("products")}
          </div>
        </div>
        {hasText(marketingConsentLabel) ? (
          <div className="mt-6">
            <MarketingConsentCheckbox
              label={marketingConsentLabel ?? undefined}
              checked={marketingOptIn}
              disabled={pending}
              onChange={setMarketingOptIn}
            />
          </div>
        ) : null}
        {submissionError ? (
          <p className="form-error" role="alert">
            {hasText(copy?.[submissionError]) ? (
              copy[submissionError]
            ) : (
              <span className="sr-only">
                Your request could not be submitted. Please retry, or contact
                the bakery.
              </span>
            )}
          </p>
        ) : null}
        {hasText(copy?.disclaimer) || hasText(copy?.submit) ? (
          <div className="form-bottom">
            <Text value={copy?.disclaimer} />
            {hasText(copy?.submit) ? (
              <button
                type="submit"
                className="button-primary"
                disabled={pending}
              >
                {pending ? copy?.submitting : copy.submit}
                {pending && !hasText(copy?.submitting) ? (
                  <span className="sr-only">Submitting request</span>
                ) : null}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
        <Text className="draft-note mt-5" value={copy?.note} />
      </fieldset>
    </form>
  );
}
