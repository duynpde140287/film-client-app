/**
 * File chuyên lưu trữ các giá trị Boolean, cờ nhị phân và hàm kiểm tra boolean
 * Giúp kiểm soát chặt chẽ luồng code và trạng thái hiển thị của Frontend
 */

export const BOOLEAN_FLAGS = {
  TRUE: true as const,
  FALSE: false as const,
  ENABLED: true as const,
  DISABLED: false as const,
  ACTIVE: true as const,
  INACTIVE: false as const,
  CONNECTED: true as const,
  DISCONNECTED: false as const,
  LOCKED: true as const,
  UNLOCKED: false as const,
  VISIBLE: true as const,
  HIDDEN: false as const,
  LOADING: true as const,
  IDLE: false as const,
} as const;

export const DEFAULT_BOOLEANS = {
  IS_AUTHENTICATED: false,
  IS_SUBMITTING: false,
  IS_LOADING: false,
  IS_MODAL_OPEN: false,
  IS_REFETCHING: false,
  IS_EXPORTING: false,
  IS_PAUSED: false,
  IS_CONNECTED: false,
} as const;

/**
 * Kiểm tra xem một đối tượng có thỏa mãn cờ sẵn sàng (readiness) hay không
 */
export function isReady(readiness?: { ready: boolean } | null): boolean {
  return readiness?.ready === true;
}

/**
 * Kiểm tra tài khoản hoặc mục cấu hình có đang được bật hay không
 */
export function isEnabled(item?: { enabled?: boolean } | null): boolean {
  return item?.enabled === true;
}

/**
 * Kiểm tra trạng thái người dùng có đang hoạt động hợp lệ không
 */
export function isActiveUser(user?: { enabled?: boolean; licenseStatus?: string } | null): boolean {
  if (!user || user.enabled === false) return false;
  if (user.licenseStatus && user.licenseStatus !== 'ACTIVE') return false;
  return true;
}

/**
 * Kiểm tra trạng thái công việc (Job) đã hoàn tất thành công chưa
 */
export function isJobCompleted(status?: string | null): boolean {
  return status === 'COMPLETED' || status === 'SUCCESS';
}

/**
 * Kiểm tra trạng thái công việc (Job) có đang xử lý hay không
 */
export function isJobProcessing(status?: string | null): boolean {
  return status === 'RUNNING' || status === 'PENDING' || status === 'QUEUED';
}

/**
 * Kiểm tra trạng thái công việc có bị lỗi hay không
 */
export function isJobError(status?: string | null): boolean {
  return status === 'ERROR' || status === 'ERROR_FINAL' || status === 'FAILED';
}

/**
 * Kiểm tra trạng thái tự động hóa dự án có đang chạy hay không
 */
export function isAutomationRunning(status?: string | null): boolean {
  return status === 'RUNNING';
}


