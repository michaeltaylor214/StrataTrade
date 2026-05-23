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

  const approved  = jobs.filter(j => j.status === 'approved').length;
  const cancelled = jobs.filter(j => j.status === 'cancelled').length;

  return (
    <PortalLayout title="Job History" subtitle="All completed and cancelled jobs">

      {/* Summary */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{jobs.length}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Jobs</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{approved}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{cancelled}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cancelled</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-600">No completed jobs yet</p>
          <p className="text-sm text-slate-400 mt-1">Your completed and approved jobs will appear here</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">Scheme / Address</th>
                <th className="table-header">Type</th>
                <th className="table-header">Date</th>
                <th className="table-header">Outcome</th>
                <th className="table-header">Feedback</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-900">{j.scheme_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{j.scheme_address}</p>
                  </td>
                  <td className="table-cell">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
                      {j.job_type}
                    </span>
                  </td>
                  <td className="table-cell text-slate-500">
                    {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : '—'}
                  </td>
                  <td className="table-cell">
                    <StatusBadge value={j.status} variant="job" />
                  </td>
                  <td className="table-cell text-sm max-w-xs">
                    {j.rejection_reason ? (
                      <span className="text-red-500 font-medium text-xs">⚠ {j.rejection_reason}</span>
                    ) : j.status === 'approved' ? (
                      <span className="text-emerald-600 font-medium text-xs">✓ Certificate approved</span>
                    ) : '—'}
                  </td>
                  <td className="table-cell">
                    <Link
                      to={`/trade/jobs/${j.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  );
}
