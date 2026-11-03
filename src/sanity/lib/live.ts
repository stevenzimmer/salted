import "server-only";
import { defineLive } from "next-sanity/live";
import { client } from "./client";
import { readToken } from "./token";

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken,
  browserToken: false,
  // Intentionally omit browserToken: no read credential is serialized to visitors.
  // Presentation provides authenticated live subscriptions through its Studio session.
});
