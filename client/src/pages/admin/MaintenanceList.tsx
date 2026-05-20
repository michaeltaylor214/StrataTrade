import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { MaintenanceRequest } from '../../types';

export default function MaintenanceList() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('submitted');

  useEffect(() => {
    api.get<MaintenanceRequest[]>(`/maintenance${filter ? `?status=${filter}` : ''}`)
      .then(setRequests).finally(() => setLoading(false));
  }, [filter]);

  return (
    <PortalLayout title="Maintenance Requests">
      <div className="flex gap-3 mb-4">
        {['','submitted','under_review','job_created','completed','declined'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Title</th>
                <th className="table-header">Scheme</th>
                <th className="table-header">Priority</th>
                <th className="table-header">From</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell font-medium">{r.title}</td>
                  <td className="table-cell text-gray-500">{r.scheme_name}</td>
                  <td className="table-cell"><StatusBadge value={r.priority} variant="priority" /></td>
                  <td className="table-cell text-gray-500 capitalize text-xs">{r.submitted_by_role.replace(/_/g,' ')}</td>
                  <td className="table-cell"><StatusBadge value={r.status} /></td>
                  <td className="table-cell text-gray-500">{new Date(r.created_at).toLocaleDateString('en-AU')}</td>
                  <td className="table-cell"><Link to={`/admin/maintenance/${r.id}`} className="text-blue-600 hover:underline text-sm">Review</Link></td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400">No requests</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
