"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  minimumSpecialOrderDate,
  validateSpecialOrder,
  type SpecialOrderErrors,
  type SpecialOrderInput,
} from "@/lib/special-orders";

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

export function SpecialOrderForm() {
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
    return errors[name] ? (
      <p className="form-error" id={`${name}-error`}>
        {errors[name]}
      </p>
    ) : null;
  }

  if (submitted)
    return (
      <div
        className="special-success"
        role="status"
        tabIndex={-1}
        ref={(element) => element?.focus()}
      >
        <span className="confirmation-icon">
          <Check size={30} />
        </span>
        <p className="eyebrow mt-7">Looking good</p>
        <h2>
          Your request preview
          <br />
          is ready.
        </h2>
        <p>
          Your details passed the form check. This is a preview, so nothing was
          sent to the bakery or saved on a server.
        </p>
        <p>
          When special orders launch, the bakery will review each request before
          approval and payment. Submission won’t guarantee acceptance.
        </p>
        <button
          type="button"
          className="button-outline mt-7"
          onClick={() => setSubmitted(false)}
        >
          Start another preview <ArrowUpRight size={16} />
        </button>
      </div>
    );

  return (
    <form className="special-order-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="name">
            Your name <span>*</span>
          </label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="First and last name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errorFor("name")}
        </div>
        <div className="form-field">
          <label htmlFor="email">
            Email address <span>*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errorFor("email")}
        </div>
        <div className="form-field">
          <label htmlFor="phone">
            Phone number <span>*</span>
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={30}
            placeholder="(555) 123-4567"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errorFor("phone")}
        </div>
        <div className="form-field">
          <label htmlFor="date">
            Your ideal date <span>*</span>
          </label>
          <Input
            id="date"
            name="date"
            type="date"
            min={minimumSpecialOrderDate()}
            required
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "date-error" : undefined}
          />
          {errorFor("date")}
        </div>
        <div className="form-field col-span-full">
          <label htmlFor="products">
            What are you dreaming of? <span>*</span>
          </label>
          <Textarea
            id="products"
            name="products"
            required
            maxLength={3000}
            rows={4}
            placeholder="Tell us about the flavors, sizes, and bread you have in mind."
            aria-invalid={Boolean(errors.products)}
            aria-describedby={errors.products ? "products-error" : undefined}
          />
          {errorFor("products")}
        </div>
        <div className="form-field">
          <label htmlFor="quantity">
            Approximate quantity <span>*</span>
          </label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={1000}
            required
            placeholder="How many breads?"
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={errors.quantity ? "quantity-error" : undefined}
          />
          {errorFor("quantity")}
        </div>
        <div className="form-field">
          <label htmlFor="eventType">
            What’s the occasion? <span className="optional">Optional</span>
          </label>
          <Input
            id="eventType"
            name="eventType"
            maxLength={150}
            placeholder="A gathering, a birthday, just because…"
          />
        </div>
        <div className="form-field col-span-full">
          <label htmlFor="notes">
            Anything else? <span className="optional">Optional</span>
          </label>
          <Textarea
            id="notes"
            name="notes"
            maxLength={3000}
            rows={3}
            placeholder="Questions or details we should know."
          />
        </div>
      </div>
      <div className="form-bottom">
        <p>
          No payment is collected with a request. Every special order needs
          bakery approval.
        </p>
        <button type="submit" className="button-primary">
          Preview my request <ArrowUpRight size={17} />
        </button>
      </div>
      <p className="draft-note mt-5">
        Preview form · your information stays in this browser and is not sent or
        persisted.
      </p>
    </form>
  );
}
