"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { VisualEditing } from "next-sanity/visual-editing";

export function DraftVisualEditing() {
  const router = useRouter();
  // next-sanity 13's default handler ignores mutation refreshes. Presentation
  // supplies authenticated mutation notifications, so refresh the RSC tree for
  // both edits and manual refreshes without exposing any API token to a browser.
  const refresh = useCallback(async () => {
    router.refresh();
  }, [router]);
  return <VisualEditing refresh={refresh} />;
}
