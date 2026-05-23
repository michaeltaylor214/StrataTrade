import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Trade, Job } from '../../types';

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [rating, setRating] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  function load() {
    api.get<Trade>(`/trades/${id}`).then(t => { setTrade(t); setRating(String(t.rating || '')); });
    api.get<Job[]>(`/trades/${id}/history`).then(setJobs);
  }
  useEffect(load, [id]);

  async function saveRating() {
    setSaving(true);
    await api.patch(`/trades/${id}`, { rating: rating ? Number(rating) : null });
    setSaving(false);
    load();
  }

  async function toggleActive() {
    if (!trade) return;
    setToggling(true);
    await api.patch(`/trades/${id}`, { isActive: !trade.is_active });
    setToggling(false);
    load();
  }

  if (!trade) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  const nswBadge = trade.nsw_licence_verified === true
    ? { label: '✓ Verified', cls: 'bg-green-100 text-green-700 border-green-200' }
    : trade.nsw_licence_verified === false
    ? { label: '✗ Failed', cls: 'bg-red-100 text-red-700 border-red-200' }
    : { label: 'Not checked', cls: 'bg-gray-100 text-gray-500 border-gray-200' };

  return (
    <PortalLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{trade.company_name}</h1>
          <p className="text-gray-500">{trade.full_name} · {trade.trade_category}</p>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            trade.is_active
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {toggling ? '…' : trade.is_active ? 'Deactivate Account' : 'Activate Account'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-4 text-sm space-y-2">
            <p><span className="text-gray-500">Email:</span> {trade.email}</p>
            <p><span className="text-gray-500">ABN:</span> {trade.abn}</p>
            <p><span className="text-gray-500">Licence:</span> {trade.licence_number || '—'}</p>
            <p className={trade.insurance_expiring_soon ? 'text-orange-600' : ''}>
              <span className="text-gray-500">Insurance expiry:</span>{' '}
              {trade.insurance_expiry_date ? new Date(trade.insurance_expiry_date).toLocaleDateString('en-AU') : '—'}
              {trade.insurance_expiring_soon && ' ⚠️'}
            </p>
            <p>
              <span className="text-gray-500">Status:</span>{' '}
              <span className={trade.is_active ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {trade.is_active ? 'Active' : 'Inactive — pending review'}
              </span>
            </p>
          </div>

          {/* NSW Licence Verification */}
          <div className="card p-4 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">NSW Licence Check</p>
            <div className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-medium ${nswBadge.cls}`}>
              {nswBadge.label}
            </div>
            {trade.nsw_licence_status && (
              <p className="mt-2 text-xs text-gray-500">{trade.nsw_licence_status}</p>
            )}
            {trade.nsw_licence_verified === false && (
              <p className="mt-2 text-xs text-amber-600">
                ⚠ Verify manually before activating. Check <a href="https://www.nsw.gov.au/housing-and-construction/building-and-renovating/check-licences-and-certificates" target="_blank" rel="noreferrer" className="underline">NSW Fair Trading</a>.
              </p>
            )}
          </div>

          <div className="card p-4">
            <label className="label text-xs">Rating (0–5)</label>
            <div className="flex gap-2 mt-1">
              <input type="number" min="0" max="5" step="0.1" className="input text-sm w-24"
                value={rating} onChange={e => setRating(e.target.value)} />
              <button className="btn-secondary btn-sm" onClick={saveRating} disabled={saving}>Save</button>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Job History</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Scheme</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="table-row">
                    <td className="table-cell text-gray-400">#{j.id}</td>
                    <td className="table-cell">{j.scheme_name}</td>
                    <td className="table-cell capitalize">{j.job_type}</td>
                    <td className="table-cell"><StatusBadge value={j.status} variant="job" /></td>
                    <td className="table-cell text-gray-500">{j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : '—'}</td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400">No jobs yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
