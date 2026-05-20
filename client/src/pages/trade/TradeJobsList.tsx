import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';

const STATUS_FILTERS = ['all', 'assigned', 'confirmed', 'completed', 'certificate_uploaded', 'approved', 'cancelled'] as const;

export default function TradeJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Job[]>('/trades/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <PortalLayout title="My Jobs">
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Type</th>
                <th className="table-header">Scheduled</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
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
                  <td className="table-cell text-right">
                    <Link to={`/trade/jobs/${j.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-gray-400">No jobs found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
