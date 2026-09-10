import {
  useEffect,
  useState,
  useId,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, X, Inbox, Download, AlertCircle } from "lucide-react";
import { mediaBlob } from "./api";
import type { Job } from "./types";
const labels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã khóa",
  EXPIRED: "Hết hạn",
  SCHEDULED: "Chưa đến hạn",
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng",
  DONE: "Hoàn tất",
  PARTIAL: "Đang thực hiện",
  QUEUED: "Đang chờ",
  RUNNING: "Đang chạy",
  PROCESSING: "Đang tạo",
  ERROR: "Có lỗi",
  ERROR_FINAL: "Cần thử lại",
  STALE: "Cần cập nhật",
  PASS: "Đạt kiểm tra",
  BLOCKED: "Chưa đủ dữ liệu",
  QC_PASSED: "Đạt QC",
  QC_BLOCKED: "Cần kiểm tra",
  EXPORTING: "Đang xuất",
  IDLE: "Chưa chạy",
  CONNECTED: "Đã kết nối",
  CONFIGURED: "Đã cấu hình",
  DISCONNECTED: "Chưa kết nối",
  UNAVAILABLE: "Chưa khả dụng",
  PAUSED: "Đã tạm dừng",
};
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <i />
      {labels[status] || status}
    </span>
  );
}
export function Spinner() {
  return <LoaderCircle className="spin" size={18} />;
}
export function Loading() {
  return (
    <div className="loading">
      <Spinner /> Đang tải không gian làm việc…
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ErrorBox({ message }: { message?: string }) {
  return message ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${wide ? "modal-wide" : ""}`}>
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Đóng">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        ["input", "select", "textarea"].includes(String(child.type))
          ? cloneElement(child as React.ReactElement<any>, {
              id,
              "aria-describedby": hint ? id + "-hint" : undefined,
            })
          : child,
      )}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(value))
    : "—";
}
export function JsonView({ value }: { value: unknown }) {
  return <pre className="code-view">{JSON.stringify(value, null, 2)}</pre>;
}
export function Media({
  job,
  download = false,
}: {
  job?: Job;
  download?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false,
      objectUrl = "";
    setUrl("");
    setError("");
    if (job?.url)
      void mediaBlob(job.url)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (!disposed) setUrl(objectUrl);
          else URL.revokeObjectURL(objectUrl);
        })
        .catch((e) => {
          if (!disposed) setError(e.message);
        });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [job?.url, job?.attempts]);
  if (!job?.url) return null;
  if (error) return <ErrorBox message={error} />;
  if (!url) return <Spinner />;
  if (download)
    return (
      <a
        className="button primary"
        href={url}
        download={`storyflow-${job.id}.${job.kind === "voice" ? "wav" : job.kind === "image" ? "png" : "mp4"}`}
      >
        <Download size={16} /> Tải xuống
      </a>
    );
  if (job.kind === "voice")
    return <audio controls preload="metadata" src={url} />;
  if (job.kind === "image")
    return (
      <img
        className="media-image"
        src={url}
        alt={`Ảnh cảnh ${job.sceneIndex}`}
      />
    );
  return (
    <video controls preload="metadata" src={url} className="media-video" />
  );
}
