// Thin fetch wrappers for /api/handbook/<action>.

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function call(action, { method = "GET", query, body, token, keepalive } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : "";
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api/handbook/${action}${qs}`, {
      method, headers, keepalive,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "You're offline");
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok) {
    const msg = type.includes("json") ? (await res.json().catch(() => ({}))).error : "";
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return type.includes("json") ? res.json() : res.blob();
}

export const api = {
  config: () => call("config"),
  access: (memberId) => call("access", { query: { m: memberId } }),
  start: (identity) => call("start", { method: "POST", body: identity }),
  review: (r) => call("review", { query: { r } }),
  draft: (payload, opts = {}) => call("draft", { method: "POST", body: payload, keepalive: opts.keepalive }),

  adminLogin: (password) => call("admin-login", { method: "POST", body: { password } }),
  adminSummary: (token) => call("admin-summary", { token }),
  adminExport: (token) => call("admin-export", { token }),
  adminSettings: (token, patch) => call("admin-settings", { method: "POST", body: patch, token }),
  adminDeleteReview: (token, id) => call("admin-delete-review", { method: "POST", body: { id }, token }),
  adminDigest: (token, mode, kind = "weekly") => call("admin-digest", { method: "POST", body: { mode, kind }, token }),
};
