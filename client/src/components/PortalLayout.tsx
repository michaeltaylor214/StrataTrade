import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface Props {
  title?: string;
  children: ReactNode;
}

export default function PortalLayout({ title, children }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
