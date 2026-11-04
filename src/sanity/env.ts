// A non-existent ID allows offline schema extraction. Runtime fetches are guarded.
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "unconfigured";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-02-01";
export const isSanityConfigured = projectId !== "unconfigured";
