import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PortalLayout({ title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {(title || subtitle) && (
            <div className="mb-7">
              {title    && <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
