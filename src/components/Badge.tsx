import React from 'react';

const labels: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  DISABLED: 'Đã khóa',
  EXPIRED: 'Hết hạn',
  SCHEDULED: 'Chưa đến hạn',
  DRAFT: 'Bản nháp',
  READY: 'Sẵn sàng',
  DONE: 'Hoàn tất',
  PARTIAL: 'Đang thực hiện',
  QUEUED: 'Đang chờ',
  RUNNING: 'Đang chạy',
  PROCESSING: 'Đang tạo',
  ERROR: 'Có lỗi',
  ERROR_FINAL: 'Cần thử lại',
  STALE: 'Cần cập nhật',
  PASS: 'Đạt kiểm tra',
  BLOCKED: 'Chưa đủ dữ liệu',
  QC_PASSED: 'Đạt QC',
  QC_BLOCKED: 'Cần kiểm tra',
  EXPORTING: 'Đang xuất',
  IDLE: 'Chưa chạy',
  CONNECTED: 'Đã kết nối',
  CONFIGURED: 'Đã cấu hình',
  DISCONNECTED: 'Chưa kết nối',
  UNAVAILABLE: 'Chưa khả dụng',
  PAUSED: 'Đã tạm dừng',
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}
