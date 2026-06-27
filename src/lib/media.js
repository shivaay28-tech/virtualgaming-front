/** Static media base URL — set REACT_APP_MEDIA_URL to a CDN origin in production. */
const MEDIA_BASE = (process.env.REACT_APP_MEDIA_URL || process.env.PUBLIC_URL || "").replace(/\/$/, "");

export function mediaUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MEDIA_BASE}${p}`;
}
