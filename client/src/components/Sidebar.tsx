import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard',         to: '/admin' },
    { label: 'Companies',         to: '/admin/companies' },
    { label: 'Schemes',           to: '/admin/schemes' },
    { label: 'Jobs',              to: '/admin/jobs' },
    { label: 'Building Audits',   to: '/admin/audits' },
    { label: 'Maintenance',       to: '/admin/maintenance' },
    { label: 'Quotes',            to: '/admin/quotes' },
    { label: 'Trades',            to: '/admin/trades' },
    { label: 'Invoices',          to: '/admin/invoices' },
  ],
  strata_manager: [
    { label: 'Dashboard',         to: '/strata' },
    { label: 'My Schemes',        to: '/strata/schemes' },
    { label: 'Quotes to Review',  to: '/strata/quotes' },
    { label: 'Maintenance',       to: '/strata/maintenance' },
  ],
  building_manager: [
    { label: 'Dashboard',         to: '/building' },
    { label: 'My Building',       to: '/building/my-building' },
    { label: 'Submit Request',    to: '/building/maintenance/new' },
    { label: 'My Requests',       to: '/building/maintenance' },
  ],
  trade: [
    { label: 'Dashboard',         to: '/trade' },
    { label: 'My Jobs',           to: '/trade/jobs' },
    { label: 'Quote Requests',    to: '/trade/quotes' },
    { label: 'Job History',       to: '/trade/history' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = NAV_ITEMS[user.role] ?? [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-blue-700">StrataTrade</span>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">{user.role.replace(/_/g, ' ')}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
        <button
          onClick={handleLogout}
          className="mt-2 w-full text-left text-xs text-red-600 hover:text-red-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
