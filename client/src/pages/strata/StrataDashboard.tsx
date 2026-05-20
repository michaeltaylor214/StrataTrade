import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Scheme, QuoteRequest, MaintenanceRequest } from '../../types';

interface SchemeWithStatus extends Scheme {
  complianceStatus: 'green' | 'amber' | 'red';
  overdue: number;
  dueSoon: number;
}

export default function StrataDashboard() {
  const [schemes, setSchemes] = useState<SchemeWithStatus[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<QuoteRequest[]>([]);
  const [recentRequests, setRecentRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [rawSchemes, quotes, requests] = await Promise.all([
        api.get<Scheme[]>('/schemes'),
        api.get<QuoteRequest[]>('/quotes'),
        api.get<MaintenanceRequest[]>('/maintenance'),
      ]);

      // Fetch compliance status for each scheme
      const withStatus = await Promise.all(
        rawSchemes.map(async s => {
          try {
            const status = await api.get<{ status: 'green'|'amber'|'red'; overdue: number; dueSoon: number }>(`/schemes/${s.id}/compliance-status`);
            return { ...s, complianceStatus: status.status, overdue: status.overdue, dueSoon: status.dueSoon };
          } catch {
            return { ...s, complianceStatus: 'green' as const, overdue: 0, dueSoon: 0 };
          }
        })
      );

      setSchemes(withStatus);
      setPendingQuotes(quotes.filter(q => q.ready_for_review && q.status !== 'accepted'));
      setRecentRequests(requests.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const STATUS_DOT: Record<string, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-400',
    red:   'bg-red-500',
  };

  return (
    <PortalLayout title="Dashboard">
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-8">
          {/* Schemes RAG */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">My Schemes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schemes.map(s => (
                <Link key={s.id} to={`/strata/schemes/${s.id}`}
                  className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT[s.complianceStatus]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 truncate">{s.address}</p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    {s.overdue > 0 && <p className="text-red-600">{s.overdue} overdue</p>}
                    {s.dueSoon > 0 && <p className="text-amber-600">{s.dueSoon} due soon</p>}
                    {s.overdue === 0 && s.dueSoon === 0 && <p className="text-green-600">All current</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending quotes */}
          {pendingQuotes.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Quotes Awaiting Your Decision</h2>
              <div className="space-y-2">
                {pendingQuotes.map(q => (
                  <Link key={q.id} to={`/strata/quotes`} className="card p-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium">{q.scheme_name}</p>
                      <p className="text-sm text-gray-500">{q.description_of_works}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{q.quote_count} quotes</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent maintenance requests */}
          {recentRequests.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Recent Maintenance Requests</h2>
                <Link to="/strata/maintenance" className="text-sm text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {recentRequests.map(r => (
                      <tr key={r.id} className="table-row">
                        <td className="table-cell font-medium">{r.title}</td>
                        <td className="table-cell text-gray-500">{r.scheme_name}</td>
                        <td className="table-cell text-xs capitalize">{r.status.replace(/_/g,' ')}</td>
                        <td className="table-cell text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-AU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
