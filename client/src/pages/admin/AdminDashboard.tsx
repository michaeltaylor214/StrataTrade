import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { AdminDashboard as DashData } from '../../types';

interface StatCardProps {
  label: string;
  value: number;
  to: string;
  icon: React.ReactNode;
  urgent?: boolean;
  color?: 'blue' | 'red' | 'amber' | 'green' | 'slate';
}

function StatCard({ label, value, to, icon, urgent, color = 'blue' }: StatCardProps) {
  const isUrgent = urgent && value > 0;

  const colorMap = {
    blue:  { bg: 'bg-blue-100',    text: 'text-blue-600',    val: 'text-blue-700' },
    red:   { bg: 'bg-red-100',     text: 'text-red-500',     val: 'text-red-700' },
    amber: { bg: 'bg-amber-100',   text: 'text-amber-600',   val: 'text-amber-700' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-600', val: 'text-emerald-700' },
    slate: { bg: 'bg-slate-100',   text: 'text-slate-500',   val: 'text-slate-700' },
  };
  const c = isUrgent ? colorMap.red : colorMap[color];

  return (
    <Link
      to={to}
      className={`card p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group ${isUrgent ? 'ring-1 ring-red-200' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>
        <span className={c.text}>{icon}</span>
      </div>
      <div>
        <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
      </div>
      {isUrgent && value > 0 && (
        <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </Link>
  );
}

const CalIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
  </svg>
);
const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
);
const WrenchIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);
const DocIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
);
const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);
const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const BuildingIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
  </svg>
);

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashData>('/jobs/dashboard/admin')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <PortalLayout>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{today}</p>
      </div>

      {error && <div className="alert-red mb-6">{error}</div>}

      {!data ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* ── Stats grid ─────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Schemes"        value={data.activeSchemes}          to="/admin/schemes"                    icon={<BuildingIcon/>} color="blue" />
            <StatCard label="Due This Month"        value={data.dueThisMonth}           to="/admin/jobs"                       icon={<CalIcon/>}     color="amber" />
            <StatCard label="Overdue Jobs"          value={data.overdueJobs}            to="/admin/jobs?status=overdue"        icon={<AlertIcon/>}   urgent />
            <StatCard label="Certs Awaiting Approval" value={data.awaitingApproval}     to="/admin/jobs?filter=certs"          icon={<CheckIcon/>}   urgent />
            <StatCard label="Maintenance Requests"  value={data.openMaintenanceRequests}to="/admin/maintenance"                icon={<WrenchIcon/>}  color="slate" urgent={data.openMaintenanceRequests > 0} />
            <StatCard label="Open Quote Requests"   value={data.openQuoteRequests}      to="/admin/quotes"                     icon={<DocIcon/>}     color="green" />
            <StatCard label="Needs Trade Assigned"  value={data.needsAssignment}        to="/admin/jobs?status=pending_assignment" icon={<UserIcon/>} urgent />
            <StatCard label="Unconfirmed 48hrs+"    value={data.unconfirmed48hrs}       to="/admin/jobs?status=assigned"       icon={<ClockIcon/>}   urgent />
          </div>

          {/* ── Alerts row ─────────────────────────────── */}
          {(data.overdueJobs > 0 || data.needsAssignment > 0 || data.awaitingApproval > 0) && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                Items Needing Attention
              </h2>
              <div className="space-y-2">
                {data.overdueJobs > 0 && (
                  <Link to="/admin/jobs?status=overdue" className="flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors border border-red-100 group">
                    <span className="text-sm font-medium text-red-700">{data.overdueJobs} overdue job{data.overdueJobs !== 1 ? 's' : ''}</span>
                    <svg className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )}
                {data.needsAssignment > 0 && (
                  <Link to="/admin/jobs?status=pending_assignment" className="flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100 group">
                    <span className="text-sm font-medium text-amber-700">{data.needsAssignment} job{data.needsAssignment !== 1 ? 's' : ''} need{data.needsAssignment === 1 ? 's' : ''} a trade assigned</span>
                    <svg className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )}
                {data.awaitingApproval > 0 && (
                  <Link to="/admin/jobs?filter=certs" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100 group">
                    <span className="text-sm font-medium text-blue-700">{data.awaitingApproval} certificate{data.awaitingApproval !== 1 ? 's' : ''} awaiting approval</span>
                    <svg className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Quick Actions ───────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/schemes/new"   className="btn-primary btn-sm">+ New Scheme</Link>
              <Link to="/admin/audits/new"    className="btn-secondary btn-sm">+ New Audit</Link>
              <Link to="/admin/jobs/new"      className="btn-secondary btn-sm">+ Create Job</Link>
              <Link to="/admin/trades"        className="btn-secondary btn-sm">Manage Trades</Link>
              <Link to="/admin/invoices"      className="btn-secondary btn-sm">Invoices</Link>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
