import React, { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';

interface QuoteRequest {
  id: number;
  quote_request_id: number;
  description_of_works: string;
  scheme_name: string;
  trade_category: string;
  expires_at: string;
  submitted_amount: number | null;
  quote_status: string;
}

export default function TradeQuotesList() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [success, setSuccess] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.get<QuoteRequest[]>('/trades/quotes').then(setQuotes).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(quoteId: number, quoteRequestId: number) {
    const raw = amounts[quoteId];
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      setErrors(prev => ({ ...prev, [quoteId]: 'Enter a valid amount greater than zero.' }));
      return;
    }
    setErrors(prev => ({ ...prev, [quoteId]: '' }));
    setSubmitting(quoteId);
    try {
      await api.post('/quotes/authenticated', { quoteRequestId, amount });
      setSuccess(prev => ({ ...prev, [quoteId]: true }));
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, submitted_amount: amount, quote_status: 'submitted' } : q));
    } catch (err: unknown) {
      setErrors(prev => ({ ...prev, [quoteId]: err instanceof Error ? err.message : 'Submission failed.' }));
    } finally {
      setSubmitting(null);
    }
  }

  const open = quotes.filter(q => q.quote_status === 'pending' || q.quote_status === 'invited');
  const history = quotes.filter(q => !['pending', 'invited'].includes(q.quote_status));

  return (
    <PortalLayout title="My Quotes">
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Open Quote Requests</h2>
            {open.length === 0 ? (
              <p className="text-gray-400 text-sm">No open quote requests.</p>
            ) : (
              <div className="space-y-4">
                {open.map(q => (
                  <div key={q.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{q.scheme_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{q.trade_category}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        Expires {new Date(q.expires_at).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                    <p className="text-sm mb-4">{q.description_of_works}</p>

                    {success[q.id] ? (
                      <p className="text-green-600 text-sm font-medium">Quote submitted successfully.</p>
                    ) : (
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="label text-xs">Your Quote Amount (AUD, inc. GST)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={amounts[q.id] || ''}
                              onChange={e => setAmounts(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="input pl-7"
                            />
                          </div>
                          {errors[q.id] && <p className="text-red-500 text-xs mt-1">{errors[q.id]}</p>}
                        </div>
                        <button
                          onClick={() => handleSubmit(q.id, q.quote_request_id)}
                          disabled={submitting === q.id}
                          className="btn-primary"
                        >
                          {submitting === q.id ? 'Submitting…' : 'Submit Quote'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Quote History</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm">No quote history yet.</p>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Scheme</th>
                      <th className="table-header">Works</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(q => (
                      <tr key={q.id} className="table-row">
                        <td className="table-cell font-medium">{q.scheme_name}</td>
                        <td className="table-cell text-gray-500 text-sm max-w-48 truncate">{q.description_of_works}</td>
                        <td className="table-cell">
                          {q.submitted_amount != null ? `$${Number(q.submitted_amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="table-cell capitalize">
                          <span className={`text-sm font-medium ${q.quote_status === 'accepted' ? 'text-green-600' : q.quote_status === 'declined' ? 'text-red-500' : 'text-gray-500'}`}>
                            {q.quote_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
