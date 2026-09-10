import type { Session } from "./types";
export const API_BASE = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api"
).replace(/\/$/, "");
const scope = location.pathname.startsWith("/admin") ? "admin" : "creator";
const key = `storyflow.${scope}.session`;
export function getSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function saveSession(session: Session | null) {
  if (session) sessionStorage.setItem(key, JSON.stringify(session));
  else sessionStorage.removeItem(key);
  window.dispatchEvent(new Event("sessionchange"));
}
export function deviceId() {
  let id = localStorage.getItem("storyflow.device");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("storyflow.device", id);
  }
  return id;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: unknown,
  ) {
    super(message);
  }
}
let refreshing: Promise<void> | null = null;
async function authorized(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set("Authorization", `Bearer ${session.token}`);
  let response: Response;
  try {
    response = await fetch(API_BASE + path, { ...init, headers });
  } catch {
    throw new ApiError(
      "Không kết nối được máy chủ. Kiểm tra backend và thử lại.",
      "NETWORK_ERROR",
      {},
    );
  }
  if (response.status === 401 && session && retry) {
    if (!refreshing)
      refreshing = (async () => {
        try {
          const r = await fetch(API_BASE + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });
          const json = await r.json();
          if (!r.ok)
            throw new ApiError(
              json.error?.message || "Phiên đăng nhập đã hết hạn.",
              json.error?.code,
              {},
            );
          saveSession(json.data);
        } catch (e) {
          saveSession(null);
          throw e;
        }
      })().finally(() => {
        refreshing = null;
      });
    await refreshing;
    return authorized(path, init, false);
  }
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    const message = json.error?.message;
    throw new ApiError(
      Array.isArray(message)
        ? message.join("\n")
        : message || "Yêu cầu không thành công.",
      json.error?.code || "REQUEST_FAILED",
      json.error?.details,
    );
  }
  return response;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await authorized(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return (await response.json()).data;
}
export async function mediaBlob(url: string) {
  return (await authorized(url.replace(/^\/api/, ""))).blob();
}
