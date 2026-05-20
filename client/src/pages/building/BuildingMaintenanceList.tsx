import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { MaintenanceRequest } from '../../types';

export default function BuildingMaintenanceList() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MaintenanceRequest[]>('/maintenance').then(setRequests).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="My Requests">
      <div className="flex justify-end mb-4">
        <Link to="/building/maintenance/new" className="btn-primary">+ New Request</Link>
      </div>
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Title</th>
                <th className="table-header">Priority</th>
                <th className="table-header">Status</th>
                <th className="table-header">Admin Response</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell font-medium">{r.title}</td>
                  <td className="table-cell"><StatusBadge value={r.priority} variant="priority" /></td>
                  <td className="table-cell"><StatusBadge value={r.status} /></td>
                  <td className="table-cell text-gray-500 text-sm max-w-48 truncate">{r.admin_response || '—'}</td>
                  <td className="table-cell text-gray-500">{new Date(r.created_at).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-gray-400">No requests submitted yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
