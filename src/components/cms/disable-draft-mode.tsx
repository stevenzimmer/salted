"use client";
import Link from "next/link";
import { useIsPresentationTool } from "next-sanity/hooks";
export function DisableDraftMode() {
  const isPresentation = useIsPresentationTool();
  if (isPresentation) return null;
  return (
    <Link
      prefetch={false}
      href="/api/draft-mode/disable"
      className="button-primary fixed right-4 bottom-4 z-50"
    >
      Exit draft preview
    </Link>
  );
}
