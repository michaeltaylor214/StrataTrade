import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';

const COMPLETED_STATUSES = ['approved', 'cancelled'];

export default function TradeHistory() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Job[]>('/trades/jobs')
      .then(all => setJobs(all.filter(j => COMPLETED_STATUSES.includes(j.status))))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="Job History">
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Type</th>
                <th className="table-header">Completed</th>
                <th className="table-header">Outcome</th>
                <th className="table-header">Admin Feedback</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium">{j.scheme_name}</p>
                    <p className="text-xs text-gray-400">{j.scheme_address}</p>
                  </td>
                  <td className="table-cell capitalize">{j.job_type}</td>
                  <td className="table-cell text-gray-500">
                    {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : '—'}
                  </td>
                  <td className="table-cell"><StatusBadge value={j.status} variant="job" /></td>
                  <td className="table-cell text-sm text-gray-500 max-w-xs truncate">
                    {j.rejection_reason ? (
                      <span className="text-red-600">{j.rejection_reason}</span>
                    ) : j.status === 'approved' ? (
                      <span className="text-green-600">Certificate approved</span>
                    ) : '—'}
                  </td>
                  <td className="table-cell text-right">
                    <Link to={`/trade/jobs/${j.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-center text-gray-400">No completed jobs yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
