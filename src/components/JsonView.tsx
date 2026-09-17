import React from 'react';

export function JsonView({ value }: { value: unknown }) {
  return <pre className="code-view">{JSON.stringify(value, null, 2)}</pre>;
}

export function date(value?: string) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—';
}
