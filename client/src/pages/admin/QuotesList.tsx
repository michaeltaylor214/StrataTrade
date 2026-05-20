import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { QuoteRequest } from '../../types';

export default function QuotesList() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<QuoteRequest[]>('/quotes').then(setQuotes).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="Quote Requests">
      <div className="flex justify-end mb-4">
        <Link to="/admin/quotes/new" className="btn-primary">+ New Quote Request</Link>
      </div>
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Description</th>
                <th className="table-header">Status</th>
                <th className="table-header">Quotes</th>
                <th className="table-header">Ready for Review</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="table-row">
                  <td className="table-cell font-medium">{q.scheme_name}</td>
                  <td className="table-cell text-gray-500 max-w-64 truncate">{q.description_of_works}</td>
                  <td className="table-cell"><StatusBadge value={q.status} /></td>
                  <td className="table-cell">{q.quote_count}</td>
                  <td className="table-cell">
                    {q.ready_for_review
                      ? <span className="text-xs text-green-600 font-medium">Yes</span>
                      : <span className="text-xs text-gray-400">No</span>}
                  </td>
                  <td className="table-cell"><Link to={`/admin/quotes/${q.id}`} className="text-blue-600 hover:underline text-sm">View</Link></td>
                </tr>
              ))}
              {quotes.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400">No quote requests</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
