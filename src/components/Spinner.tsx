import React from 'react';
import { LoaderCircle } from 'lucide-react';

export function Spinner({ size = 18 }: { size?: number }) {
  return <LoaderCircle className="spin" size={size} />;
}

export function Loading({ message = 'Đang tải không gian làm việc…' }: { message?: string }) {
  return (
    <div className="loading">
      <Spinner /> {message}
    </div>
  );
}
