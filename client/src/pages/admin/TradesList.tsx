import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Trade } from '../../types';

export default function TradesList() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  function load() {
    const q = filter === 'all' ? '' : `?isActive=${filter === 'active'}`;
    api.get<Trade[]>(`/trades${q}`).then(setTrades).finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function toggle(id: number, current: boolean) {
    await api.patch(`/trades/${id}`, { isActive: !current });
    load();
  }

  const insuranceWarnings = trades.filter(t => t.insurance_expiring_soon && t.is_active);

  return (
    <PortalLayout title="Trades">
      {insuranceWarnings.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-700">
          ⚠️ {insuranceWarnings.length} active trade(s) have insurance expiring within 30 days: {insuranceWarnings.map(t => t.company_name).join(', ')}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['all','active','inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Trade / Company</th>
                <th className="table-header">Category</th>
                <th className="table-header">ABN</th>
                <th className="table-header">Insurance Expiry</th>
                <th className="table-header">Rating</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} className={`table-row ${t.insurance_expiring_soon ? 'bg-orange-50' : ''}`}>
                  <td className="table-cell">
                    <p className="font-medium">{t.company_name}</p>
                    <p className="text-xs text-gray-500">{t.full_name}</p>
                  </td>
                  <td className="table-cell text-gray-500">{t.trade_category}</td>
                  <td className="table-cell text-gray-500 font-mono text-xs">{t.abn}</td>
                  <td className={`table-cell text-sm ${t.insurance_expiring_soon ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                    {t.insurance_expiry_date ? new Date(t.insurance_expiry_date).toLocaleDateString('en-AU') : '—'}
                    {t.insurance_expiring_soon && ' ⚠️'}
                  </td>
                  <td className="table-cell">{t.rating ? `${t.rating}/5` : '—'}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium ${t.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {!t.is_active && (
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                        t.nsw_licence_verified === true  ? 'bg-green-100 text-green-700' :
                        t.nsw_licence_verified === false ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {t.nsw_licence_verified === true  ? '✓ NSW' :
                         t.nsw_licence_verified === false ? '✗ NSW' :
                         'NSW?'}
                      </span>
                    )}
                  </td>
                  <td className="table-cell flex gap-3">
                    <Link to={`/admin/trades/${t.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                    <button className="text-sm text-gray-500 hover:underline" onClick={() => toggle(t.id, t.is_active)}>
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400">No trades</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
