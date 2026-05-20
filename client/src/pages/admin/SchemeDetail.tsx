import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Scheme, ComplianceObligation, Job } from '../../types';

type Tab = 'obligations' | 'jobs' | 'audit';

export default function SchemeDetail() {
  const { id } = useParams<{ id: string }>();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<Tab>('obligations');
  const [applyingTemplates, setApplyingTemplates] = useState(false);

  useEffect(() => {
    api.get<Scheme>(`/schemes/${id}`).then(setScheme);
    api.get<ComplianceObligation[]>(`/schemes/${id}/obligations`).then(setObligations);
    api.get<Job[]>(`/jobs?schemeId=${id}`).then(setJobs);
  }, [id]);

  async function applyTemplates() {
    setApplyingTemplates(true);
    try {
      const result = await api.post<ComplianceObligation[]>(`/schemes/${id}/obligations/apply-templates`, {});
      setObligations(result);
    } finally { setApplyingTemplates(false); }
  }

  async function toggleObligation(obId: number, current: boolean) {
    await api.patch(`/schemes/obligations/${obId}`, { isActive: !current });
    api.get<ComplianceObligation[]>(`/schemes/${id}/obligations`).then(setObligations);
  }

  if (!scheme) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'obligations', label: 'Compliance' },
    { key: 'jobs', label: `Jobs (${jobs.length})` },
    { key: 'audit', label: 'Audit' },
  ];

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/schemes" className="hover:underline">Schemes</Link>
            <span>/</span>
            <span>{scheme.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{scheme.name}</h1>
          <p className="text-gray-500 mt-0.5">{scheme.address}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>{scheme.company_name}</span>
            {scheme.number_of_lots && <span>{scheme.number_of_lots} lots</span>}
            {scheme.has_lift && <span className="text-blue-600">Lift</span>}
            {scheme.has_pool && <span className="text-blue-600">Pool</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/schemes/${id}/edit`} className="btn-secondary btn-sm">Edit</Link>
          <Link to={`/admin/audits/new?schemeId=${id}`} className="btn-primary btn-sm">New Audit</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Obligations tab */}
      {tab === 'obligations' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{obligations.filter(o => o.is_active).length} active obligations</p>
            <button className="btn-secondary btn-sm" onClick={applyTemplates} disabled={applyingTemplates}>
              {applyingTemplates ? 'Applying…' : 'Apply Standard Templates'}
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Obligation</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Frequency</th>
                  <th className="table-header">Last Done</th>
                  <th className="table-header">Next Due</th>
                  <th className="table-header">Active</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="table-cell font-medium">{o.obligation_name}</td>
                    <td className="table-cell text-gray-500">{o.trade_category}</td>
                    <td className="table-cell">{o.frequency_months}m</td>
                    <td className="table-cell text-gray-500">{o.last_completed_date ? new Date(o.last_completed_date).toLocaleDateString('en-AU') : '—'}</td>
                    <td className="table-cell">{o.next_due_date ? new Date(o.next_due_date).toLocaleDateString('en-AU') : '—'}</td>
                    <td className="table-cell">
                      <button className={`text-xs ${o.is_active ? 'text-green-600' : 'text-gray-400'}`} onClick={() => toggleObligation(o.id, o.is_active)}>
                        {o.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
                {obligations.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400">No obligations — click Apply Standard Templates to get started</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jobs tab */}
      {tab === 'jobs' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link to={`/admin/jobs/new?schemeId=${id}`} className="btn-primary btn-sm">+ Create Job</Link>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Trade</th>
                  <th className="table-header">Scheduled</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="table-row">
                    <td className="table-cell text-gray-400">#{j.id}</td>
                    <td className="table-cell capitalize">{j.job_type}</td>
                    <td className="table-cell"><StatusBadge value={j.status} variant="job" /></td>
                    <td className="table-cell text-gray-500">{j.trade_name || '—'}</td>
                    <td className="table-cell">{j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : '—'}</td>
                    <td className="table-cell"><Link to={`/admin/jobs/${j.id}`} className="text-blue-600 hover:underline text-sm">View</Link></td>
                  </tr>
                ))}
                {jobs.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-400">No jobs</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit tab */}
      {tab === 'audit' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge value={scheme.audit_status} />
            {scheme.audit_status === 'completed' && (
              <Link to={`/admin/audits?schemeId=${id}`} className="text-blue-600 hover:underline text-sm">View audit reports</Link>
            )}
          </div>
          {scheme.audit_status !== 'completed' && (
            <p className="text-sm text-gray-500">No completed audit yet. <Link to={`/admin/audits/new?schemeId=${id}`} className="text-blue-600 hover:underline">Start a building audit</Link></p>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
