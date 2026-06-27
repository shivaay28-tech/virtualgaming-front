import { api } from "./api";

let cached = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export async function fetchPlatformPublic({ fresh = false } = {}) {
  if (!fresh && cached && Date.now() - cachedAt < CACHE_MS) return cached;
  const { data } = await api.get("/platform/public");
  cached = data;
  cachedAt = Date.now();
  return data;
}

export function clearPlatformPublicCache() {
  cached = null;
  cachedAt = 0;
}
