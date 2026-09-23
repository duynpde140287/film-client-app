import type { ISession } from '../interfaces';
import { cacheAiStatuses } from '../utils/ai-status-cache';

export const API_BASE = (
  (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:3000/api'
).replace(/\/$/, '');

const scope = 'creator';
const key = `projectx.${scope}.session`;

export function getSession(): ISession | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(key) || 'null');
    return session?.user?.is_admin === 0 ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: ISession | null) {
  if (session && session.user.is_admin !== 0) {
    sessionStorage.removeItem(key);
    window.dispatchEvent(new Event('sessionchange'));
    throw new Error('Tài khoản không được phép đăng nhập ứng dụng khách.');
  }
  if (session) {
    const { aiSessions, ...credentials } = session as ISession & { aiSessions?: Parameters<typeof cacheAiStatuses>[1] };
    if (aiSessions) cacheAiStatuses(session.user.id, aiSessions);
    sessionStorage.setItem(key, JSON.stringify(credentials));
  }
  else sessionStorage.removeItem(key);
  window.dispatchEvent(new Event('sessionchange'));
}

export function deviceId(): string {
  let id = localStorage.getItem('projectx.device');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('projectx.device', id);
  }
  return id;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details: unknown,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshing: Promise<void> | null = null;

/**
 * Format message lỗi chuẩn cho frontend
 * Backend đã prefix "Lỗi hệ thống: ..." hoặc "Lỗi: ..."
 * Nếu chưa có prefix thì thêm vào cho nhất quán
 */
function formatErrorMessage(msg: string): string {
  if (!msg) return 'Lỗi: Yêu cầu không thành công.';
  if (msg.startsWith('Lỗi hệ thống:') || msg.startsWith('Lỗi:')) return msg;
  return `Lỗi: ${msg}`;
}

export async function authorized(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.token}`);
  let response: Response;
  try {
    response = await fetch(API_BASE + path, { ...init, headers });
  } catch {
    throw new ApiError(
      'Lỗi: Không kết nối được máy chủ. Kiểm tra server và thử lại.',
      'NETWORK_ERROR',
      {},
    );
  }
  if (response.status === 401 && session && retry) {
    if (!refreshing)
      refreshing = (async () => {
        try {
          const r = await fetch(API_BASE + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });
          const json = await r.json();
          if (!r.ok)
            throw new ApiError(
              formatErrorMessage(json.error?.message || json.message || 'Phiên đăng nhập đã hết hạn.'),
              json.error?.code,
              {},
              r.status,
            );
          saveSession(json.data);
        } catch (e) {
          if (e instanceof ApiError && [401, 403].includes(e.statusCode || 0)) saveSession(null);
          throw e instanceof ApiError ? e : new ApiError('Lỗi: Tạm mất kết nối máy chủ. Phiên đăng nhập vẫn được giữ nguyên.', 'NETWORK_ERROR', {});
        }
      })().finally(() => {
        refreshing = null;
      });
    await refreshing;
    return authorized(path, init, false);
  }
  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    if (['DEVICE_NOT_ALLOWED', 'APP_ACCOUNT_REQUIRED', 'ACCOUNT_DISABLED', 'LICENSE_EXPIRED', 'LICENSE_NOT_STARTED'].includes(json.error?.code)) saveSession(null);
    const message = json.message || json.error?.message;
    const rawMsg = Array.isArray(message)
      ? message.join('\n')
      : message || 'Yêu cầu không thành công.';
    throw new ApiError(
      formatErrorMessage(rawMsg),
      json.error?.code || 'REQUEST_FAILED',
      json.error?.details,
      response.status,
    );
  }
  return response;
}

export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await authorized(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  const data = json.data !== undefined ? json.data : json;
  if (path === '/ai-sessions' || path === '/ai-sessions/check') cacheAiStatuses(getSession()?.user.id, data);
  return data;
}

export async function upload<T>(path: string, method: string, body: FormData): Promise<T> {
  const response = await authorized(path, { method, body });
  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export async function mediaBlob(url: string): Promise<Blob> {
  return (await authorized(url.replace(/^\/api/, ''))).blob();
}


