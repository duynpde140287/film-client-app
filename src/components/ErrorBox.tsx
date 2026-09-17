import React from 'react';
import { AlertCircle } from 'lucide-react';

export function ErrorBox({ message }: { message?: string }) {
  return message ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
