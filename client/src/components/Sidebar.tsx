import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Inline SVG icons ─────────────────────────────────────────────────────────
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
      <path d="M9 3h1v3H9zm5 0h1v3h-1z" strokeWidth="0" fill="currentColor" opacity="0"/>
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v4M10 14h4"/>
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 2h16a1 1 0 011 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 011-1z"/>
      <line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  hardhat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-2a1 1 0 00-1-1H3a1 1 0 00-1 1v2z"/>
      <path d="M10 10V7a2 2 0 114 0v3"/>
      <path d="M4 15v-3a8 8 0 1116 0v3"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
};

// ── Nav config ───────────────────────────────────────────────────────────────
interface NavItem { label: string; to: string; icon: string; }

const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard',       to: '/admin',            icon: 'dashboard' },
    { label: 'Strata Managers', to: '/admin/companies',  icon: 'building' },
    { label: 'Schemes',         to: '/admin/schemes',    icon: 'layers' },
    { label: 'Jobs',            to: '/admin/jobs',       icon: 'briefcase' },
    { label: 'Building Audits', to: '/admin/audits',     icon: 'clipboard' },
    { label: 'Maintenance',     to: '/admin/maintenance',icon: 'wrench' },
    { label: 'Quotes',          to: '/admin/quotes',     icon: 'document' },
    { label: 'Trades',          to: '/admin/trades',     icon: 'hardhat' },
    { label: 'Invoices',        to: '/admin/invoices',   icon: 'receipt' },
  ],
  strata_manager: [
    { label: 'Dashboard',       to: '/strata',                  icon: 'dashboard' },
    { label: 'My Schemes',      to: '/strata/schemes',          icon: 'layers' },
    { label: 'Quotes to Review',to: '/strata/quotes',           icon: 'document' },
    { label: 'Maintenance',     to: '/strata/maintenance',      icon: 'wrench' },
  ],
  building_manager: [
    { label: 'Dashboard',       to: '/building',               icon: 'dashboard' },
    { label: 'My Building',     to: '/building/my-building',   icon: 'home' },
    { label: 'Submit Request',  to: '/building/maintenance/new',icon: 'wrench' },
    { label: 'My Requests',     to: '/building/maintenance',   icon: 'clipboard' },
  ],
  trade: [
    { label: 'Dashboard',       to: '/trade',          icon: 'dashboard' },
    { label: 'My Jobs',         to: '/trade/jobs',     icon: 'briefcase' },
    { label: 'Quote Requests',  to: '/trade/quotes',   icon: 'document' },
    { label: 'Job History',     to: '/trade/history',  icon: 'clock' },
  ],
};

// ── Logo component ───────────────────────────────────────────────────────────
function Logo() {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 shrink-0">
      {/* Left building */}
      <rect x="2" y="14" width="17" height="28" rx="2" fill="#1D4ED8"/>
      <rect x="5"  y="18" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="18" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="5"  y="25" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="25" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="5"  y="32" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="32" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      {/* Right taller building */}
      <rect x="23" y="6" width="19" height="36" rx="2" fill="#2563EB"/>
      <rect x="26" y="10" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="10" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="26" y="17" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="17" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="26" y="24" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="24" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      {/* Amber badge with checkmark */}
      <circle cx="12" cy="36" r="8" fill="#F59E0B"/>
      <path d="M8.5 36l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Role label map ───────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin:            'Administrator',
  strata_manager:   'Strata Manager',
  building_manager: 'Building Manager',
  trade:            'Trade Contractor',
};

// ── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const items = NAV_ITEMS[user.role] ?? [];

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <aside className="w-64 shrink-0 bg-slate-900 flex flex-col min-h-screen">
      {/* Logo + brand */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <span className="text-white font-bold text-lg leading-none tracking-tight">
              StrataTrade
            </span>
            <p className="text-slate-400 text-xs mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                  {icons[item.icon]}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <p className="text-xs text-slate-500 truncate mb-3">{user.email}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors font-medium"
        >
          {icons.logout}
          Sign out
        </button>
      </div>
    </aside>
  );
}
