"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/cms/text";
import { clean, hasText } from "@/sanity/lib/content";
import { marketingEmail } from "@/lib/marketing-input";
import type { CommerceCopy } from "../../../sanity.types";
function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
const readHash = () => window.location.hash;
const serverHash = () => "";
const responseInput = z.object({ code: z.string() });
export function UnsubscribeForm({
  copy,
}: {
  copy: CommerceCopy["unsubscribe"];
}) {
  const fragment = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const token =
    fragment.length <= 256
      ? new URLSearchParams(fragment.slice(1)).get("token")
      : null;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectedToken, setRejectedToken] = useState<string | null>(null);
  const [state, setState] = useState<
    | "idle"
    | "success"
    | "invalidEmail"
    | "invalidLink"
    | "error"
    | "rateLimited"
  >("idle");
  // The email fallback remains active through validation/retry errors.
  const confirmToken = !!token && token !== rejectedToken;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = marketingEmail.safeParse(email);
    if (!confirmToken && !parsed.success) {
      setState("invalidEmail");
      return;
    }
    setBusy(true);
    try {
      const body = confirmToken
        ? { method: "token", token }
        : { method: "email", email: parsed.success ? parsed.data : email };
      const response = await fetch("/api/marketing/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = responseInput.parse(await response.json());
      if (response.ok && payload.code === "unsubscribed") {
        setState("success");
        window.history.replaceState(null, "", window.location.pathname);
      } else if (
        payload.code === "invalid_link" ||
        (confirmToken && payload.code === "invalid_input")
      ) {
        setRejectedToken(token);
        setState("invalidLink");
      } else if (payload.code === "rate_limited") setState("rateLimited");
      else if (payload.code === "invalid_input") setState("invalidEmail");
      else setState("error");
    } catch {
      setState("error");
    }
    setBusy(false);
  }
  const error =
    state === "invalidEmail"
      ? copy?.invalidEmail
      : state === "invalidLink"
        ? copy?.invalidLink
        : state === "rateLimited"
          ? copy?.rateLimited
          : state === "error"
            ? copy?.error
            : undefined;
  const submitLabel = confirmToken ? copy?.confirm : copy?.submit;
  return (
    <>
      {state === "success" ? (
        [copy?.confirmationHeading, copy?.confirmationBody].some(hasText) ? (
          <section
            className="max-w-xl border-t border-border py-8"
            role="status"
            aria-live="polite"
          >
            <Check size={28} className="mb-4 text-primary" aria-hidden="true" />
            <Text
              as="h2"
              className="font-display text-3xl"
              value={copy?.confirmationHeading}
            />
            <Text
              className="mt-3 text-sm leading-relaxed"
              value={copy?.confirmationBody}
            />
          </section>
        ) : null
      ) : (
        <>
          <Text
            id="unsubscribe-error"
            role="alert"
            className="mb-5 max-w-xl text-sm leading-relaxed"
            value={error}
          />
          {hasText(submitLabel) ? (
            <form
              method="post"
              className="max-w-xl border-t border-border py-8"
              onSubmit={submit}
              noValidate
              aria-busy={busy}
            >
              {confirmToken ? (
                <>
                  <Text
                    as="h2"
                    className="font-display text-2xl"
                    value={copy?.tokenHeading}
                  />
                  <Text
                    className="mb-6 mt-3 text-sm leading-relaxed"
                    value={copy?.tokenDescription}
                  />
                </>
              ) : (
                <div className="mb-6">
                  <label
                    htmlFor="unsubscribe-email"
                    className={
                      hasText(copy?.emailLabel)
                        ? "mb-2 block text-sm"
                        : "sr-only"
                    }
                  >
                    {hasText(copy?.emailLabel)
                      ? copy.emailLabel
                      : "Email address"}
                  </label>
                  <Input
                    id="unsubscribe-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    aria-label={clean(copy?.emailLabel) || "Email address"}
                    aria-invalid={state === "invalidEmail"}
                    aria-describedby={
                      hasText(error) ? "unsubscribe-error" : undefined
                    }
                    value={email}
                    disabled={busy}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={
                      hasText(copy?.emailPlaceholder)
                        ? clean(copy.emailPlaceholder)
                        : undefined
                    }
                    className="h-12 rounded-none"
                  />
                </div>
              )}
              <button
                type="submit"
                className="button-primary w-full sm:w-auto"
                disabled={busy}
              >
                {busy && hasText(copy?.busy) ? copy.busy : submitLabel}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </form>
          ) : null}
        </>
      )}
      {hasText(copy?.backHome) ? (
        <Link href="/" className="inline-link mt-6 text-sm">
          {copy.backHome}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </>
  );
}
