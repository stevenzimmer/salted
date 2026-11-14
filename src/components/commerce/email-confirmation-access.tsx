"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Text } from "@/components/cms/text";
import { hasText } from "@/sanity/lib/content";
import type { CommerceCopy } from "../../../sanity.types";
const destination = z.object({
  href: z.string().regex(/^\/order\/success\?session_id=cs_test_[A-Za-z0-9]+$/),
});
async function exchangeConfirmation(): Promise<string> {
  const fragment = window.location.hash;
  const token =
    fragment.length <= 256
      ? new URLSearchParams(fragment.slice(1)).get("confirmation")
      : null;
  if (!token) throw new Error("Confirmation link missing");
  const response = await fetch("/api/commerce/confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error("Confirmation unavailable");
  return destination.parse(await response.json()).href;
}

export function EmailConfirmationAccess({
  copy,
}: {
  copy: CommerceCopy["orderEmail"];
}) {
  const [failed, setFailed] = useState(false);
  async function openConfirmation() {
    try {
      const href = await exchangeConfirmation();
      window.location.replace(href);
    } catch {
      setFailed(true);
    }
  }
  // Exchange the browser-only fragment for a narrowly scoped HttpOnly cookie.
  useEffect(() => {
    let active = true;
    exchangeConfirmation()
      .then((href) => {
        if (active) window.location.replace(href);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div aria-live="polite">
      <Text
        role={failed ? "alert" : "status"}
        value={failed ? copy?.confirmationError : copy?.openingConfirmation}
      />
      {failed && hasText(copy?.openConfirmation) ? (
        <button className="button-primary mt-6" onClick={openConfirmation}>
          {copy.openConfirmation}
        </button>
      ) : null}
    </div>
  );
}
