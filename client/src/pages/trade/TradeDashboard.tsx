import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';

interface Dashboard {
  upcomingJobs: Job[];
  awaitingAction: Job[];
  openQuoteRequests: Array<{ id: number; quote_request_id: number; description_of_works: string; scheme_name: string }>;
}

export default function TradeDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Dashboard>('/trades/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="My Dashboard">
      {loading || !data ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-8">
          {/* Action items */}
          {data.awaitingAction.length > 0 && (
            <div className="card border-blue-200 bg-blue-50 p-4">
              <h2 className="font-semibold text-blue-800 mb-3">Action Required</h2>
              {data.awaitingAction.map(j => (
                <div key={j.id} className="flex items-center justify-between py-2 border-b border-blue-100 last:border-0">
                  <div>
                    <p className="font-medium text-blue-900">{j.scheme_name}</p>
                    <StatusBadge value={j.status} variant="job" />
                  </div>
                  <Link to={`/trade/jobs/${j.id}`} className="btn-primary btn-sm">View Job</Link>
                </div>
              ))}
            </div>
          )}

          {/* Open quote requests */}
          {data.openQuoteRequests.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Open Quote Requests</h2>
              {data.openQuoteRequests.map(q => (
                <div key={q.id} className="card p-4 flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{q.scheme_name}</p>
                    <p className="text-sm text-gray-500">{q.description_of_works}</p>
                  </div>
                  <Link to="/trade/quotes" className="btn-secondary btn-sm">Submit Quote</Link>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming jobs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Upcoming Confirmed Jobs</h2>
              <Link to="/trade/jobs" className="text-sm text-blue-600 hover:underline">All jobs</Link>
            </div>
            {data.upcomingJobs.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming confirmed jobs.</p>
            ) : (
              <div className="space-y-2">
                {data.upcomingJobs.map(j => (
                  <Link key={j.id} to={`/trade/jobs/${j.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="text-center bg-blue-50 rounded-lg p-3 w-16 shrink-0">
                      <p className="text-xs text-blue-500">{new Date(j.scheduled_date!).toLocaleDateString('en-AU', { month: 'short' })}</p>
                      <p className="text-2xl font-bold text-blue-700">{new Date(j.scheduled_date!).getDate()}</p>
                    </div>
                    <div>
                      <p className="font-medium">{j.scheme_name}</p>
                      <p className="text-sm text-gray-500">{j.scheme_address}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
