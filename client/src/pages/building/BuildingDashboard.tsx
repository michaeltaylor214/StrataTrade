import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { MaintenanceRequest, Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export default function BuildingDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<{ status: string; overdue: number; dueSoon: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_EXPLANATION: Record<string, string> = {
    green: 'All compliance obligations for your building are current. No action needed.',
    amber: 'One or more compliance obligations are due within the next 30 days. Works will be scheduled shortly.',
    red: 'One or more compliance obligations are overdue. Please contact your strata manager.',
  };

  useEffect(() => {
    async function load() {
      const [reqs, jobs] = await Promise.all([
        api.get<MaintenanceRequest[]>('/maintenance'),
        api.get<Job[]>('/jobs'),
      ]);
      setRequests(reqs);
      const today = new Date().toISOString().split('T')[0];
      setUpcomingJobs(jobs.filter(j => j.scheduled_date && j.scheduled_date >= today && !['cancelled'].includes(j.status)));

      if (user?.schemeId) {
        api.get<{ status: string; overdue: number; dueSoon: number }>(`/schemes/${user.schemeId}/compliance-status`)
          .then(setComplianceStatus).catch(() => null);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const STATUS_COLOR: Record<string, string> = { green: 'bg-green-50 border-green-300 text-green-800', amber: 'bg-amber-50 border-amber-300 text-amber-800', red: 'bg-red-50 border-red-300 text-red-800' };
  const DOT: Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };

  return (
    <PortalLayout title="My Building">
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-6">
          {/* Compliance status */}
          {complianceStatus && (
            <div className={`border rounded-lg p-4 flex items-start gap-3 ${STATUS_COLOR[complianceStatus.status] || ''}`}>
              <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${DOT[complianceStatus.status]}`} />
              <div>
                <p className="font-semibold">Compliance Status: {complianceStatus.status.toUpperCase()}</p>
                <p className="text-sm mt-0.5">{STATUS_EXPLANATION[complianceStatus.status]}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Link to="/building/maintenance/new" className="btn-primary">+ Submit Maintenance Request</Link>
          </div>

          {/* My requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">My Maintenance Requests</h2>
              <Link to="/building/maintenance" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Title</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 5).map(r => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell font-medium">{r.title}</td>
                      <td className="table-cell"><StatusBadge value={r.priority} variant="priority" /></td>
                      <td className="table-cell"><StatusBadge value={r.status} /></td>
                      <td className="table-cell text-gray-500">{new Date(r.created_at).toLocaleDateString('en-AU')}</td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr><td colSpan={4} className="table-cell text-center text-gray-400">No requests submitted yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming works */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Upcoming Scheduled Works</h2>
            <div className="space-y-2">
              {upcomingJobs.map(j => (
                <div key={j.id} className="card p-4 flex items-center gap-4">
                  <div className="text-center bg-blue-50 rounded-lg p-3 w-16 shrink-0">
                    <p className="text-xs text-blue-500">{new Date(j.scheduled_date!).toLocaleDateString('en-AU', { month: 'short' })}</p>
                    <p className="text-2xl font-bold text-blue-700">{new Date(j.scheduled_date!).getDate()}</p>
                  </div>
                  <div>
                    <p className="font-medium capitalize">{j.obligation_name || j.job_type}</p>
                    <p className="text-sm text-gray-500 capitalize">{j.trade_category || j.job_type}</p>
                  </div>
                </div>
              ))}
              {upcomingJobs.length === 0 && <p className="text-gray-400 text-sm">No upcoming works scheduled.</p>}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
