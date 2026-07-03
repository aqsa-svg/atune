// Server-only configuration. The application key reaches only the data plane
// from server code; the management key never leaves .cohesivity.
export const COHESIVITY_BASE = process.env.COHESIVITY_BASE ?? "https://cohesivity.ai";
export const COH_TENANT = process.env.COH_TENANT_ID ?? "";
export const COH_APP_KEY = process.env.COH_APP_KEY ?? "";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
