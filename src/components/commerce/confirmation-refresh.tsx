"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasText } from "@/sanity/lib/content";
export function ConfirmationRefresh({ label }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!hasText(label)) return null;
  return (
    <button
      type="button"
      className="text-button mt-5"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </button>
  );
}
