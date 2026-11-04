import "server-only";
import { draftMode, cookies } from "next/headers";
import { resolvePerspectiveFromCookies } from "next-sanity/live";
import type { StegaBranded } from "@sanity/client/stega";
import type { QueryParams, SanityQueries } from "@sanity/client";
import { sanityFetch } from "./live";
import { isSanityConfigured } from "../env";

// No mock-content fallback. Offline setup is empty; configured fetch failures surface.
export async function fetchContent<Q extends keyof SanityQueries>(
  query: Q,
  params: QueryParams = {},
): Promise<StegaBranded<SanityQueries[Q]> | null> {
  if (!isSanityConfigured) return null;
  const draft = (await draftMode()).isEnabled;
  const perspective = draft
    ? await resolvePerspectiveFromCookies({ cookies: await cookies() })
    : "published";
  const { data } = await sanityFetch({
    query,
    params,
    perspective,
    stega: draft,
    requestTag: "salted.editorial",
  });
  // TypeScript cannot correlate the generic query key through ClientReturn.
  return data as StegaBranded<SanityQueries[Q]>;
}
