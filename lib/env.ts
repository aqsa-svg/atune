// Server-only configuration. The application key reaches only the data plane
// from server code; the management key never leaves .cohesivity.
export const COHESIVITY_BASE = process.env.COHESIVITY_BASE ?? "https://cohesivity.ai";
export const COH_TENANT = process.env.COH_TENANT_ID ?? "";
export const COH_APP_KEY = process.env.COH_APP_KEY ?? "";
// On Vercel, auto-derive the public URL from the stable production domain so we
// never hardcode it; falls back to localhost in dev.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
