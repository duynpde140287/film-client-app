import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  showNotification: () => {},
  removeNotification: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'success', duration = 4000) => {
      const id = crypto.randomUUID();
      setNotifications((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
      }}
    >
      {children}
      {notifications.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 420,
          }}
        >
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`toast-notification toast-${item.type}`}
              style={{
                background:
                  item.type === 'error'
                    ? 'rgba(239, 68, 68, 0.92)'
                    : item.type === 'warning'
                      ? 'rgba(245, 158, 11, 0.92)'
                      : item.type === 'info'
                        ? 'rgba(56, 189, 248, 0.92)'
                        : 'rgba(16, 185, 129, 0.92)',
                color: '#fff',
                padding: '12px 18px',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: '13.5px',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <span>{item.message}</span>
              <button
                onClick={() => removeNotification(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
