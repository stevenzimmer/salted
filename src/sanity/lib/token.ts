import "server-only";
// SANITY_API_TOKEN is a server-only compatibility alias for the setup token.
export const readToken =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN;
