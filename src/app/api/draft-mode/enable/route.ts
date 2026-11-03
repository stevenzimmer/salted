import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { client } from "@/sanity/lib/client";
import { isSanityConfigured } from "@/sanity/env";
import { readToken } from "@/sanity/lib/token";

export async function GET(request: Request) {
  if (!isSanityConfigured || !readToken)
    return new Response("Draft preview is not configured.", { status: 503 });
  const handler = defineEnableDraftMode({
    client: client.withConfig({
      token: readToken,
      useCdn: false,
    }),
  });
  return handler.GET(request);
}
