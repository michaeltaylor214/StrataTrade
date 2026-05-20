import React, { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { QuoteRequest, Quote } from '../../types';

export default function StrataQuotes() {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);

  function load() {
    api.get<QuoteRequest[]>('/quotes').then(setQuoteRequests).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function loadDetail(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    const detail = await api.get<QuoteRequest>(`/quotes/${id}`);
    setQuoteRequests(prev => prev.map(q => q.id === id ? detail : q));
    setExpanded(id);
  }

  async function acceptQuote(quoteId: number, qrId: number) {
    if (!window.confirm('Accept this quote? A job will be created and the contractor will be notified.')) return;
    setAccepting(quoteId);
    try {
      await api.post(`/quotes/${quoteId}/accept`, {});
      load();
      setExpanded(null);
    } finally { setAccepting(null); }
  }

  return (
    <PortalLayout title="Quotes to Review">
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-4">
          {quoteRequests.length === 0 && (
            <div className="card p-8 text-center text-gray-400">
              No quote requests are currently awaiting your decision.
            </div>
          )}
          {quoteRequests.map(qr => (
            <div key={qr.id} className="card overflow-hidden">
              <button className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                onClick={() => loadDetail(qr.id)}>
                <div>
                  <p className="font-semibold text-gray-900">{qr.scheme_name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{qr.description_of_works}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{qr.quote_count} quotes</span>
                  <span className="text-gray-400">{expanded === qr.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === qr.id && qr.quotes && (
                <div className="border-t border-gray-100 px-6 py-4">
                  <p className="text-sm text-gray-500 mb-4">Trade names are anonymised until you accept a quote.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {qr.quotes.filter((q: Quote) => q.status !== 'declined').map((q: Quote) => (
                      <div key={q.id} className={`border rounded-lg p-4 ${q.status === 'accepted' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">Licensed {q.trade_category}</p>
                            {q.notes && <p className="text-sm text-gray-700 mt-1">{q.notes}</p>}
                            {q.valid_until && (
                              <p className="text-xs text-gray-400 mt-1">
                                Valid until {new Date(q.valid_until).toLocaleDateString('en-AU')}
                              </p>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            ${Number(q.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {q.status === 'submitted' && qr.status !== 'accepted' && (
                          <button className="btn-primary btn-sm w-full mt-3"
                            onClick={() => acceptQuote(q.id, qr.id)}
                            disabled={accepting === q.id}>
                            {accepting === q.id ? 'Accepting…' : 'Accept this quote'}
                          </button>
                        )}
                        {q.status === 'accepted' && (
                          <p className="text-center text-sm text-green-700 font-medium mt-3">Quote accepted</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
