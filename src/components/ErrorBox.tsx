import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function ErrorBox({ message }: { message?: string }) {
  const [visibleMessage, setVisibleMessage] = useState<string | undefined>(message);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setVisibleMessage(message);
    setExiting(false);
    if (message) {
      const timer = setTimeout(() => setExiting(true), 4500);
      const removeTimer = setTimeout(() => setVisibleMessage(undefined), 4800);
      return () => {
        clearTimeout(timer);
        clearTimeout(removeTimer);
      };
    }
  }, [message]);

  if (!visibleMessage) return null;

  return (
    <div
      className={`toast-error-card ${exiting ? 'fade-out' : ''}`}
      role="alert"
    >
      <AlertCircle size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{visibleMessage}</span>
      <button
        aria-label="Đóng thông báo lỗi"
        type="button"
        onClick={() => setVisibleMessage(undefined)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
