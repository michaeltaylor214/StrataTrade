import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Scheme } from '../../types';

export default function SchemesList() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Scheme[]>('/schemes')
      .then(setSchemes)
      .finally(() => setLoading(false));
  }, []);

  const filtered = schemes.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.address.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <PortalLayout title="Schemes">
      <div className="flex items-center justify-between mb-4">
        <input
          className="input w-72"
          placeholder="Search schemes…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <Link to="/admin/schemes/new" className="btn-primary">+ New Scheme</Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading…</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Company</th>
                <th className="table-header">Address</th>
                <th className="table-header">Lots</th>
                <th className="table-header">Audit</th>
                <th className="table-header">Building Mgr</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell font-medium">{s.name}</td>
                  <td className="table-cell text-gray-500">{s.company_name}</td>
                  <td className="table-cell text-gray-500 max-w-48 truncate">{s.address}</td>
                  <td className="table-cell">{s.number_of_lots}</td>
                  <td className="table-cell"><StatusBadge value={s.audit_status} /></td>
                  <td className="table-cell text-gray-500 text-xs">{s.building_manager_name || '—'}</td>
                  <td className="table-cell">
                    <Link to={`/admin/schemes/${s.id}`}
                      className="px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400">No schemes found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
