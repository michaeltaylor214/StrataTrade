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

const OUTCOME_STYLE: Record<string, string> = {
  accepted: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  declined: 'text-red-600 bg-red-50 border-red-200',
  submitted:'text-blue-600 bg-blue-50 border-blue-200',
};

export default function TradeQuotesList() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [amounts, setAmounts]   = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [errors, setErrors]   = useState<Record<number, string>>({});
  const [success, setSuccess] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.get<QuoteRequest[]>('/trades/quotes').then(setQuotes).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(quoteId: number, quoteRequestId: number) {
    const raw    = amounts[quoteId];
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
    } finally { setSubmitting(null); }
  }

  const open    = quotes.filter(q => ['pending','invited'].includes(q.quote_status));
  const history = quotes.filter(q => !['pending','invited'].includes(q.quote_status));

  return (
    <PortalLayout title="Quote Requests" subtitle="Review and submit quotes for upcoming works">
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-8">

          {/* ── Open Quote Requests ───────────────────── */}
          <div>
            <div className="section-header">
              <h2 className="section-title">
                Open Requests
                {open.length > 0 && (
                  <span className="ml-2 inline-flex w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold items-center justify-center">
                    {open.length}
                  </span>
                )}
              </h2>
            </div>

            {open.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <p className="font-semibold text-slate-600">No open quote requests</p>
                <p className="text-sm text-slate-400 mt-1">You'll be notified when new requests come through</p>
              </div>
            ) : (
              <div className="space-y-4">
                {open.map(q => {
                  const daysLeft = Math.ceil((new Date(q.expires_at).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={q.id} className="card p-5 border-l-4 border-l-amber-400">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900 text-base">{q.scheme_name}</p>
                          <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                            {q.trade_category}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          daysLeft <= 2 ? 'bg-red-50 text-red-600 border-red-200' :
                          daysLeft <= 5 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Expires today'}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm text-slate-700">
                        {q.description_of_works}
                      </div>

                      {/* Quote input */}
                      {success[q.id] ? (
                        <div className="alert-green flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Quote submitted successfully — we'll be in touch
                        </div>
                      ) : (
                        <div>
                          <label className="label">Your Quote Amount (AUD inc. GST)</label>
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={amounts[q.id] || ''}
                                onChange={e => setAmounts(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="input pl-8 text-base font-semibold"
                              />
                            </div>
                            <button
                              onClick={() => handleSubmit(q.id, q.quote_request_id)}
                              disabled={submitting === q.id}
                              className="btn-amber shrink-0"
                            >
                              {submitting === q.id ? 'Submitting…' : 'Submit Quote'}
                            </button>
                          </div>
                          {errors[q.id] && (
                            <p className="text-red-500 text-xs mt-1.5 font-medium">{errors[q.id]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Quote History ─────────────────────────── */}
          {history.length > 0 && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Quote History</h2>
              </div>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="table-header">Scheme</th>
                      <th className="table-header">Works</th>
                      <th className="table-header">Your Amount</th>
                      <th className="table-header">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(q => (
                      <tr key={q.id} className="table-row">
                        <td className="table-cell font-semibold">{q.scheme_name}</td>
                        <td className="table-cell text-slate-500 max-w-48 truncate">{q.description_of_works}</td>
                        <td className="table-cell font-semibold">
                          {q.submitted_amount != null
                            ? `$${Number(q.submitted_amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${OUTCOME_STYLE[q.quote_status] ?? 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                            {q.quote_status}
                          </span>
                        </td>
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
