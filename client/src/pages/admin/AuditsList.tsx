import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { BuildingAudit } from '../../types';

export default function AuditsList() {
  const [audits, setAudits] = useState<BuildingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const schemeId = searchParams.get('schemeId') || '';

  useEffect(() => {
    api.get<BuildingAudit[]>(`/audits${schemeId ? `?schemeId=${schemeId}` : ''}`)
      .then(setAudits).finally(() => setLoading(false));
  }, [schemeId]);

  return (
    <PortalLayout title="Building Audits">
      <div className="flex justify-end mb-4">
        <Link to="/admin/audits/new" className="btn-primary">+ New Audit</Link>
      </div>
      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Date</th>
                <th className="table-header">Condition</th>
                <th className="table-header">Status</th>
                <th className="table-header">Conducted By</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id} className="table-row">
                  <td className="table-cell font-medium">{a.scheme_name}</td>
                  <td className="table-cell">{new Date(a.audit_date).toLocaleDateString('en-AU')}</td>
                  <td className="table-cell capitalize">{a.overall_condition || '—'}</td>
                  <td className="table-cell"><StatusBadge value={a.status} /></td>
                  <td className="table-cell text-gray-500">{a.conducted_by_name}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/audits/${a.id}`}
                        className="px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                        Edit
                      </Link>
                      <Link to={`/admin/audits/${a.id}/report`}
                        className="px-3 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200">
                        Report
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {audits.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400">No audits</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
