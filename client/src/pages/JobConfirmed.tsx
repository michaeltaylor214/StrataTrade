import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function JobConfirmed() {
  const [params] = useSearchParams();
  const status = params.get('status') || 'confirmed';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">{status === 'confirmed' ? '✓' : '📅'}</div>
        <h2 className="text-xl font-semibold text-gray-900">
          {status === 'confirmed' ? 'Job confirmed' : 'Reschedule request noted'}
        </h2>
        <p className="text-gray-500 mt-2 text-sm">
          {status === 'confirmed'
            ? 'Thank you. Your confirmation has been received. You will receive further details closer to the scheduled date.'
            : 'Your reschedule request has been noted. Our team will be in touch to arrange a new time.'}
        </p>
        <p className="mt-6 text-xs text-gray-400">StrataTrade — Compliance & Maintenance Management</p>
      </div>
    </div>
  );
}
