import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Trade } from '../../types';

const CATEGORIES = ['Electrical', 'Fire Safety', 'Plumbing', 'Lift', 'Pool', 'Building/General'];

interface PreferredTrade {
  id: number;
  trade_id: number;
  trade_category: string;
  trade_company: string;
  trade_name: string;
}

interface SchemeWithTrades {
  id: number;
  name: string;
  address: string;
  number_of_lots: number;
  has_lift: boolean;
  has_pool: boolean;
  preferred_trades: PreferredTrade[];
}

interface CompanyDetail {
  id: number;
  name: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_code: string;
  is_active: boolean;
  schemes: SchemeWithTrades[];
}

interface AddTradeState {
  schemeId: number | null;
  category: string;
  tradeId: string;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [adding, setAdding] = useState<AddTradeState>({ schemeId: null, category: '', tradeId: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  function load() {
    api.get<CompanyDetail>(`/schemes/companies/${id}`).then(setCompany);
  }

  useEffect(() => {
    load();
    api.get<Trade[]>('/trades?isActive=true').then(setTrades);
  }, [id]);

  async function toggleActive() {
    if (!company) return;
    setToggling(true);
    await api.patch(`/schemes/companies/${id}`, { isActive: !company.is_active });
    setToggling(false);
    load();
  }

  async function removePreferredTrade(prefId: number) {
    await api.delete(`/schemes/preferred-trades/${prefId}`);
    load();
  }

  async function addPreferredTrade(schemeId: number) {
    if (!adding.category || !adding.tradeId) return;
    setSaving(true);
    await api.post(`/schemes/${schemeId}/preferred-trades`, {
      tradeId: Number(adding.tradeId),
      tradeCategory: adding.category,
    });
    setSaving(false);
    setAdding({ schemeId: null, category: '', tradeId: '' });
    load();
  }

  // Trades filtered to currently selected category
  const filteredTrades = adding.category
    ? trades.filter(t => t.trade_category === adding.category)
    : trades;

  if (!company) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  return (
    <PortalLayout>
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/companies" className="hover:underline">Strata Managers</Link>
            <span>/</span>
            <span>{company.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
            {company.contact_name  && <span>{company.contact_name}</span>}
            {company.contact_email && <span>{company.contact_email}</span>}
            {company.contact_phone && <span>{company.contact_phone}</span>}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {company.company_code}
            </span>
            <span className={`text-xs font-medium ${company.is_active ? 'text-green-600' : 'text-gray-400'}`}>
              {company.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`px-4 py-2 rounded-md text-sm font-medium border ${
            company.is_active
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
          }`}
        >
          {toggling ? '…' : company.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>

      {/* Buildings */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Buildings ({company.schemes.length})
      </h2>

      {company.schemes.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p>No buildings linked to this company yet.</p>
          <Link to="/admin/schemes/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            + Add a scheme
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {company.schemes.map(scheme => (
            <div key={scheme.id} className="card p-5">
              {/* Scheme header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link
                    to={`/admin/schemes/${scheme.id}`}
                    className="font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                  >
                    {scheme.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">{scheme.address}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {scheme.number_of_lots && <span>{scheme.number_of_lots} lots</span>}
                    {scheme.has_lift && <span className="text-blue-500">Lift</span>}
                    {scheme.has_pool && <span className="text-blue-500">Pool</span>}
                  </div>
                </div>
                <Link
                  to={`/admin/schemes/${scheme.id}`}
                  className="px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  Full Details
                </Link>
              </div>

              {/* Preferred trades table */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Assigned Trades
                </p>
                {scheme.preferred_trades.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No trades assigned yet</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-1.5 pr-4 text-xs font-medium text-gray-500 w-36">Category</th>
                        <th className="text-left py-1.5 pr-4 text-xs font-medium text-gray-500">Company</th>
                        <th className="text-left py-1.5 text-xs font-medium text-gray-500">Contact</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheme.preferred_trades.map(pt => (
                        <tr key={pt.id} className="border-b border-gray-50">
                          <td className="py-2 pr-4">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                              {pt.trade_category}
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-medium">{pt.trade_company}</td>
                          <td className="py-2 text-gray-500 text-xs">{pt.trade_name}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removePreferredTrade(pt.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add preferred trade */}
              {adding.schemeId === scheme.id ? (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <select
                    className="input text-sm py-1.5 w-40"
                    value={adding.category}
                    onChange={e => setAdding(a => ({ ...a, category: e.target.value, tradeId: '' }))}
                  >
                    <option value="">Category…</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="input text-sm py-1.5 flex-1"
                    value={adding.tradeId}
                    onChange={e => setAdding(a => ({ ...a, tradeId: e.target.value }))}
                    disabled={!adding.category}
                  >
                    <option value="">Select trade…</option>
                    {filteredTrades.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.company_name} — {t.full_name}
                      </option>
                    ))}
                    {adding.category && filteredTrades.length === 0 && (
                      <option disabled>No active {adding.category} trades</option>
                    )}
                  </select>
                  <button
                    onClick={() => addPreferredTrade(scheme.id)}
                    disabled={saving || !adding.category || !adding.tradeId}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Assign'}
                  </button>
                  <button
                    onClick={() => setAdding({ schemeId: null, category: '', tradeId: '' })}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAdding({ schemeId: scheme.id, category: '', tradeId: '' })}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  + Assign a trade to this building
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
