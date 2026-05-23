import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';

const FILTERS = [
  { key: 'all',                  label: 'All' },
  { key: 'assigned',             label: 'Assigned' },
  { key: 'confirmed',            label: 'Confirmed' },
  { key: 'certificate_uploaded', label: 'Cert Uploaded' },
  { key: 'approved',             label: 'Approved' },
] as const;

const STATUS_BORDER: Record<string, string> = {
  assigned:             'border-l-blue-400',
  confirmed:            'border-l-amber-400',
  completed:            'border-l-violet-400',
  certificate_uploaded: 'border-l-indigo-400',
  approved:             'border-l-emerald-400',
  cancelled:            'border-l-red-300',
  pending_assignment:   'border-l-slate-300',
};

export default function TradeJobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Job[]>('/trades/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <PortalLayout title="My Jobs" subtitle={`${filtered.length} job${filtered.length !== 1 ? 's' : ''} shown`}>
      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
              filter === f.key
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className={`ml-1.5 text-xs ${filter === f.key ? 'opacity-80' : 'text-slate-400'}`}>
                ({jobs.filter(j => j.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
          </div>
          <p className="font-semibold text-slate-600">No jobs found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different filter above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => (
            <Link
              key={j.id}
              to={`/trade/jobs/${j.id}`}
              className={`card flex items-center gap-4 p-4 border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${STATUS_BORDER[j.status] ?? 'border-l-slate-200'}`}
            >
              {/* Date block */}
              <div className="shrink-0 w-14 text-center">
                {j.scheduled_date ? (
                  <>
                    <p className="text-xl font-bold text-slate-800 leading-none">
                      {new Date(j.scheduled_date).getDate()}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      {new Date(j.scheduled_date).toLocaleDateString('en-AU', { month: 'short' })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-300 font-medium">TBD</p>
                )}
              </div>

              <div className="w-px h-10 bg-slate-100 shrink-0" />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{j.scheme_name}</p>
                <p className="text-sm text-slate-500 truncate mt-0.5">{j.scheme_address}</p>
                {j.rejection_reason && (
                  <p className="text-xs text-red-500 mt-1 font-medium">⚠ {j.rejection_reason}</p>
                )}
              </div>

              {/* Type tag */}
              <span className="shrink-0 hidden sm:inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
                {j.job_type}
              </span>

              {/* Status */}
              <div className="shrink-0">
                <StatusBadge value={j.status} variant="job" />
              </div>

              <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
