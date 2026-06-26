import { api } from "./api";

let cached = null;

export async function fetchPlatformPublic() {
  if (cached) return cached;
  const { data } = await api.get("/platform/public");
  cached = data;
  return data;
}

export function clearPlatformPublicCache() {
  cached = null;
}
