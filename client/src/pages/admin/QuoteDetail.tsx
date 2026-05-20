import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { QuoteRequest, Trade } from '../../types';

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<QuoteRequest | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [inviteIds, setInviteIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<QuoteRequest>(`/quotes/${id}`).then(setQr);
    api.get<Trade[]>('/trades?isActive=true').then(setTrades);
  }
  useEffect(load, [id]);

  async function markReady() {
    setSaving(true);
    try {
      await api.patch(`/quotes/${id}/ready-for-review`, {});
      load();
    } finally { setSaving(false); }
  }

  async function acceptQuote(quoteId: number) {
    if (!window.confirm('Accept this quote and create a job?')) return;
    setSaving(true);
    try {
      await api.post(`/quotes/${quoteId}/accept`, {});
      load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function sendInvitations() {
    if (inviteIds.length === 0) { setError('Select at least one trade'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/quotes', {
        schemeId: qr?.scheme_id,
        descriptionOfWorks: qr?.description_of_works,
        inviteTradeIds: inviteIds,
      });
      alert('Invitations sent');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  if (!qr) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  return (
    <PortalLayout>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/quotes" className="hover:underline">Quotes</Link>
        <span>/</span>
        <span>{qr.scheme_name}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{qr.scheme_name}</h1>
            <p className="text-sm text-gray-700 mb-4">{qr.description_of_works}</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            {qr.quotes && qr.quotes.length > 0 ? (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Submitted Quotes</h2>
                {qr.quotes.map(q => (
                  <div key={q.id} className={`border rounded-lg p-4 mb-3 ${q.status === 'accepted' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{q.company_name || `Trade #${q.trade_id}`}</p>
                        <p className="text-sm text-gray-500">{q.trade_category}</p>
                        {q.notes && <p className="text-sm text-gray-700 mt-1">{q.notes}</p>}
                        {q.valid_until && <p className="text-xs text-gray-400 mt-1">Valid until {new Date(q.valid_until).toLocaleDateString('en-AU')}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${Number(q.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
                        {q.status === 'submitted' && qr.status !== 'accepted' && (
                          <button className="btn-primary btn-sm mt-2" onClick={() => acceptQuote(q.id)} disabled={saving}>Accept Quote</button>
                        )}
                        {q.status === 'accepted' && <span className="text-xs text-green-700 font-medium">Accepted</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No quotes submitted yet.</p>
            )}
          </div>

          {/* Invite trades */}
          {qr.status === 'open' && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Send Invitations</h2>
              <p className="text-sm text-gray-500 mb-3">Select trades to invite to quote on this work.</p>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {trades.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={inviteIds.includes(t.id)}
                      onChange={e => setInviteIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                      className="rounded" />
                    {t.company_name} — {t.trade_category}
                    {t.insurance_expiring_soon && <span className="text-orange-500 text-xs">Insurance expiring soon</span>}
                  </label>
                ))}
              </div>
              <button className="btn-primary" onClick={sendInvitations} disabled={saving || inviteIds.length === 0}>
                {saving ? 'Sending…' : `Send to ${inviteIds.length} trade(s)`}
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="card p-4 space-y-3">
            <div className="text-sm space-y-2">
              <p><span className="text-gray-500">Status:</span> <span className="capitalize">{qr.status.replace(/_/g,' ')}</span></p>
              <p><span className="text-gray-500">Quotes received:</span> {qr.quote_count}</p>
              <p><span className="text-gray-500">Ready for strata review:</span> {qr.ready_for_review ? 'Yes' : 'No'}</p>
            </div>
            {!qr.ready_for_review && qr.status !== 'accepted' && qr.quote_count > 0 && (
              <button className="btn-primary w-full text-sm" onClick={markReady} disabled={saving}>
                Mark Ready for Strata Review
              </button>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
