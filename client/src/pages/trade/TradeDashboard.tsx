import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface Dashboard {
  upcomingJobs: Job[];
  awaitingAction: Job[];
  openQuoteRequests: Array<{ id: number; quote_request_id: number; description_of_works: string; scheme_name: string }>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    mon: d.toLocaleDateString('en-AU', { month: 'short' }).toUpperCase(),
    full: d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TradeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Dashboard>('/trades/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <PortalLayout>
      {/* Greeting header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's your schedule and tasks for today.</p>
      </div>

      {loading || !data ? (
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading…
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Summary pills ─────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{data.awaitingAction.length}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Need Action</p>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{data.upcomingJobs.length}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming Jobs</p>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{data.openQuoteRequests.length}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Open Quotes</p>
              </div>
            </div>
          </div>

          {/* ── Action Required ───────────────────────────── */}
          {data.awaitingAction.length > 0 && (
            <div>
              <div className="section-header">
                <h2 className="section-title flex items-center gap-2">
                  <span className="inline-flex w-5 h-5 rounded-full bg-amber-500 items-center justify-center">
                    <span className="text-white text-xs font-bold">{data.awaitingAction.length}</span>
                  </span>
                  Action Required
                </h2>
              </div>
              <div className="space-y-3">
                {data.awaitingAction.map(j => (
                  <div key={j.id} className="card p-4 border-l-4 border-l-amber-400 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{j.scheme_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{j.scheme_address}</p>
                    </div>
                    <StatusBadge value={j.status} variant="job" />
                    <Link
                      to={`/trade/jobs/${j.id}`}
                      className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Take Action →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Open Quote Requests ───────────────────────── */}
          {data.openQuoteRequests.length > 0 && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Open Quote Requests</h2>
                <Link to="/trade/quotes" className="text-sm text-blue-600 hover:underline font-medium">View all</Link>
              </div>
              <div className="space-y-3">
                {data.openQuoteRequests.map(q => (
                  <div key={q.id} className="card p-4 border-l-4 border-l-emerald-400 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{q.scheme_name}</p>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{q.description_of_works}</p>
                    </div>
                    <Link
                      to="/trade/quotes"
                      className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Submit Quote
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Upcoming Jobs ─────────────────────────────── */}
          <div>
            <div className="section-header">
              <h2 className="section-title">Upcoming Jobs</h2>
              <Link to="/trade/jobs" className="text-sm text-blue-600 hover:underline font-medium">All jobs →</Link>
            </div>

            {data.upcomingJobs.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">No upcoming confirmed jobs</p>
                <p className="text-slate-400 text-xs mt-1">Jobs will appear here once confirmed by admin</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingJobs.map(j => {
                  const dt = formatDate(j.scheduled_date!);
                  return (
                    <Link key={j.id} to={`/trade/jobs/${j.id}`} className="job-card">
                      <div className="job-date-pill">
                        <span className="day">{dt.day}</span>
                        <span className="mon">{dt.mon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{j.scheme_name}</p>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{j.scheme_address}</p>
                        <p className="text-xs text-slate-400 mt-1">{dt.full}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge value={j.status} variant="job" />
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
