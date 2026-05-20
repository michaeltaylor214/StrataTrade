import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Scheme, ComplianceObligation, MaintenanceRequest, Job, JobDocument } from '../../types';

type Tab = 'compliance' | 'maintenance' | 'rectification' | 'certificates' | 'calendar' | 'documents';

export default function StrataSchemeDetail() {
  const { id } = useParams<{ id: string }>();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [tab, setTab] = useState<Tab>('compliance');
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [certs, setCerts] = useState<JobDocument[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<{ status: string; overdue: number; dueSoon: number } | null>(null);

  useEffect(() => {
    api.get<Scheme>(`/schemes/${id}`).then(setScheme);
    api.get<ComplianceObligation[]>(`/schemes/${id}/obligations`).then(setObligations);
    api.get<MaintenanceRequest[]>(`/maintenance?schemeId=${id}`).then(setRequests);
    api.get<Job[]>(`/jobs?schemeId=${id}`).then(setJobs);
    api.get<{ status: string; overdue: number; dueSoon: number }>(`/schemes/${id}/compliance-status`).then(setComplianceStatus);
  }, [id]);

  // Load approved certs when certificates tab selected
  useEffect(() => {
    if (tab === 'certificates') {
      // Gather all approved job documents across jobs for this scheme
      Promise.all(jobs.filter(j => j.status === 'approved').map(j =>
        api.get<JobDocument[]>(`/jobs/${j.id}/documents`)
      )).then(arrays => setCerts(arrays.flat().filter(d => d.approved_by_admin && d.document_type === 'certificate')));
    }
  }, [tab, jobs]);

  if (!scheme) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'compliance',   label: 'Compliance' },
    { key: 'maintenance',  label: `Maintenance (${requests.length})` },
    { key: 'rectification', label: 'Rectification' },
    { key: 'certificates', label: 'Certificates' },
    { key: 'calendar',     label: 'Calendar' },
    { key: 'documents',    label: 'Documents' },
  ];

  const STATUS_COLOR: Record<string, string> = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600' };

  return (
    <PortalLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/strata/schemes" className="hover:underline">Schemes</Link>
            <span>/</span>
            <span>{scheme.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{scheme.name}</h1>
          <p className="text-gray-500">{scheme.address}</p>
          {complianceStatus && (
            <p className={`mt-1 text-sm font-medium ${STATUS_COLOR[complianceStatus.status]}`}>
              Compliance: {complianceStatus.status.toUpperCase()}
              {complianceStatus.overdue > 0 && ` — ${complianceStatus.overdue} overdue`}
              {complianceStatus.dueSoon > 0 && ` — ${complianceStatus.dueSoon} due within 30 days`}
            </p>
          )}
        </div>
        {scheme.audit_status === 'completed' && (
          <Link to={`/strata/schemes/${id}/audit-report`} className="btn-secondary btn-sm">View Audit Report</Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Compliance */}
      {tab === 'compliance' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Obligation</th>
                <th className="table-header">Category</th>
                <th className="table-header">Frequency</th>
                <th className="table-header">Last Done</th>
                <th className="table-header">Next Due</th>
              </tr>
            </thead>
            <tbody>
              {obligations.filter(o => o.is_active).map(o => {
                const today = new Date();
                const due = o.next_due_date ? new Date(o.next_due_date) : null;
                const isOverdue = due && due < today;
                const isDueSoon = due && !isOverdue && (due.getTime() - today.getTime()) < 30 * 24 * 60 * 60 * 1000;
                return (
                  <tr key={o.id} className={`table-row ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-amber-50' : ''}`}>
                    <td className="table-cell font-medium">{o.obligation_name}</td>
                    <td className="table-cell text-gray-500">{o.trade_category}</td>
                    <td className="table-cell">{o.frequency_months}m</td>
                    <td className="table-cell text-gray-500">{o.last_completed_date ? new Date(o.last_completed_date).toLocaleDateString('en-AU') : '—'}</td>
                    <td className={`table-cell font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : ''}`}>
                      {due ? due.toLocaleDateString('en-AU') : '—'}
                    </td>
                  </tr>
                );
              })}
              {obligations.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-400">No obligations</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Maintenance */}
      {tab === 'maintenance' && (
        <div>
          <div className="flex justify-end mb-3">
            <Link to="/strata/maintenance/new" className="btn-primary btn-sm">+ Submit Request</Link>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Title</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="table-cell font-medium">{r.title}</td>
                    <td className="table-cell"><StatusBadge value={r.priority} variant="priority" /></td>
                    <td className="table-cell"><StatusBadge value={r.status} /></td>
                    <td className="table-cell text-gray-500">{new Date(r.created_at).toLocaleDateString('en-AU')}</td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={4} className="table-cell text-center text-gray-400">No requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Certificates */}
      {tab === 'certificates' && (
        <div>
          {certs.length === 0 ? (
            <p className="text-gray-400">No approved certificates for this scheme yet.</p>
          ) : (
            <div className="space-y-2">
              {certs.map(doc => (
                <div key={doc.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{doc.original_filename}</p>
                    <p className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('en-AU')}</p>
                  </div>
                  <a href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Download</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {tab === 'calendar' && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Scheduled Works</h2>
          <div className="space-y-2">
            {jobs.filter(j => j.scheduled_date && !['cancelled','approved'].includes(j.status))
              .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime())
              .map(j => (
                <div key={j.id} className="card p-4 flex items-center gap-4">
                  <div className="text-center bg-blue-50 rounded-lg p-3 w-16 shrink-0">
                    <p className="text-xs text-blue-500">{new Date(j.scheduled_date!).toLocaleDateString('en-AU', { month: 'short' })}</p>
                    <p className="text-2xl font-bold text-blue-700">{new Date(j.scheduled_date!).getDate()}</p>
                  </div>
                  <div>
                    <p className="font-medium capitalize">{j.obligation_name || j.job_type}</p>
                    <p className="text-sm text-gray-500">{j.trade_category}</p>
                    <StatusBadge value={j.status} variant="job" />
                  </div>
                </div>
              ))}
            {jobs.filter(j => j.scheduled_date).length === 0 && (
              <p className="text-gray-400">No scheduled works.</p>
            )}
          </div>
        </div>
      )}

      {/* Rectification */}
      {tab === 'rectification' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Findings from the building audit that require rectification works.</p>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Category</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Description</th>
                  <th className="table-header">Severity</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={5} className="table-cell text-center text-gray-400">Contact your platform administrator for rectification details.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div>
          <p className="text-sm text-gray-500">Upload existing maintenance schedules and legacy documents for this scheme.</p>
          <div className="mt-3 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-400 text-sm">
            Document upload — coming in Phase 2
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
