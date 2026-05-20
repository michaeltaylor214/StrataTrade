import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { AdminDashboard as DashData } from '../../types';

interface StatCardProps {
  label: string;
  value: number;
  to: string;
  urgent?: boolean;
}

function StatCard({ label, value, to, urgent }: StatCardProps) {
  return (
    <Link to={to} className={`card p-6 hover:shadow-md transition-shadow ${urgent && value > 0 ? 'border-red-300 bg-red-50' : ''}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${urgent && value > 0 ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </Link>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<DashData>('/jobs/dashboard/admin')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  return (
    <PortalLayout title="Admin Dashboard">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!data ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Schemes"        value={data.activeSchemes}            to="/admin/schemes" />
            <StatCard label="Due This Month"        value={data.dueThisMonth}             to="/admin/jobs" />
            <StatCard label="Overdue Jobs"          value={data.overdueJobs}              to="/admin/jobs?status=overdue" urgent />
            <StatCard label="Certs Awaiting Approval" value={data.awaitingApproval}       to="/admin/jobs?filter=certs" urgent />
            <StatCard label="Open Maintenance Requests" value={data.openMaintenanceRequests} to="/admin/maintenance" urgent={data.openMaintenanceRequests > 0} />
            <StatCard label="Open Quote Requests"   value={data.openQuoteRequests}        to="/admin/quotes" />
            <StatCard label="Needs Trade Assigned"  value={data.needsAssignment}          to="/admin/jobs?status=pending_assignment" urgent />
            <StatCard label="Unconfirmed 48hrs+"    value={data.unconfirmed48hrs}         to="/admin/jobs?status=assigned" urgent />
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin/schemes/new"    className="btn-primary btn-sm">+ New Scheme</Link>
              <Link to="/admin/audits/new"     className="btn-secondary btn-sm">+ New Audit</Link>
              <Link to="/admin/jobs/new"       className="btn-secondary btn-sm">+ Create Job</Link>
              <Link to="/admin/trades"         className="btn-secondary btn-sm">Manage Trades</Link>
              <Link to="/admin/invoices"       className="btn-secondary btn-sm">Invoices</Link>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
