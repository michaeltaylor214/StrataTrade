import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job, JobDocument, Trade } from '../../types';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [docs, setDocs] = useState<JobDocument[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDocId, setRejectDocId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<Job>(`/jobs/${id}`).then(setJob);
    api.get<JobDocument[]>(`/jobs/${id}/documents`).then(setDocs);
    api.get<Trade[]>('/trades?isActive=true').then(setTrades);
  }
  useEffect(load, [id]);

  async function assignTrade() {
    if (!selectedTrade) return;
    setSaving(true); setError('');
    try {
      await api.patch(`/jobs/${id}/assign`, { tradeId: Number(selectedTrade), scheduledDate: scheduledDate || null });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function cancelJob() {
    if (!cancelReason) { setError('Please provide a cancellation reason'); return; }
    setSaving(true);
    try {
      await api.patch(`/jobs/${id}/cancel`, { reason: cancelReason });
      load();
    } finally { setSaving(false); }
  }

  async function approveDoc(docId: number) {
    await api.patch(`/jobs/documents/${docId}/approve`, {});
    load();
  }

  async function rejectDoc() {
    if (!rejectDocId || !rejectReason) return;
    setSaving(true);
    try {
      await api.patch(`/jobs/documents/${rejectDocId}/reject`, { reason: rejectReason });
      setRejectDocId(null); setRejectReason('');
      load();
    } finally { setSaving(false); }
  }

  if (!job) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  const certs = docs.filter(d => d.document_type === 'certificate');
  const photos = docs.filter(d => d.document_type === 'photo');
  const notes = docs.filter(d => d.document_type === 'completion_note');

  return (
    <PortalLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/jobs" className="hover:underline">Jobs</Link>
            <span>/</span>
            <span>#{job.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Job #{job.id}</h1>
          <p className="text-gray-500 mt-0.5">{job.scheme_name} — {job.scheme_address}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={job.status} variant="job" />
          <span className="capitalize text-sm text-gray-500 border border-gray-200 px-2 py-0.5 rounded">{job.job_type}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Details card */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Job Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Obligation</dt><dd>{job.obligation_name || '—'}</dd></div>
              <div><dt className="text-gray-500">Scheduled</dt><dd>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-AU') : '—'}</dd></div>
              <div><dt className="text-gray-500">Trade</dt><dd>{job.trade_name || '—'}</dd></div>
              <div><dt className="text-gray-500">Trade category</dt><dd>{job.trade_category || '—'}</dd></div>
              {job.admin_notes && <div className="col-span-2"><dt className="text-gray-500">Admin notes</dt><dd className="whitespace-pre-wrap">{job.admin_notes}</dd></div>}
            </dl>
          </div>

          {/* Documents */}
          {(certs.length > 0 || photos.length > 0 || notes.length > 0) && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h2>

              {certs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Certificates</h3>
                  {certs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <a href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">{doc.original_filename}</a>
                        {doc.rejection_reason && <p className="text-xs text-red-500 mt-0.5">Rejected: {doc.rejection_reason}</p>}
                      </div>
                      {!doc.approved_by_admin && !doc.rejection_reason && (
                        <div className="flex gap-2">
                          <button className="btn-primary btn-sm" onClick={() => approveDoc(doc.id)}>Approve</button>
                          <button className="btn-danger btn-sm" onClick={() => setRejectDocId(doc.id)}>Reject</button>
                        </div>
                      )}
                      {doc.approved_by_admin && <span className="text-xs text-green-600 font-medium">Approved</span>}
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Completion Notes</h3>
                  {notes.map(doc => (
                    <p key={doc.id} className="text-sm text-gray-700 bg-gray-50 rounded p-3">{doc.file_path}</p>
                  ))}
                </div>
              )}

              {photos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Photos ({photos.length})</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map(doc => (
                      <a key={doc.id} href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer">
                        <img src={`/uploads/${doc.file_path}`} alt="Site photo" className="w-full h-20 object-cover rounded border border-gray-200" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {rejectDocId && (
                <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-2">Rejection reason</p>
                  <textarea className="input text-sm min-h-[80px]" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why the certificate was rejected…" />
                  <div className="flex gap-2 mt-2">
                    <button className="btn-danger btn-sm" onClick={rejectDoc} disabled={saving}>Confirm rejection</button>
                    <button className="btn-secondary btn-sm" onClick={() => { setRejectDocId(null); setRejectReason(''); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          {/* Assign trade */}
          {!['approved','cancelled'].includes(job.status) && (
            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Assign / Reassign Trade</h3>
              {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
              <div className="space-y-2">
                <select className="input text-sm" value={selectedTrade} onChange={e => setSelectedTrade(e.target.value)}>
                  <option value="">Select trade…</option>
                  {trades.filter(t => !job.trade_category || t.trade_category === job.trade_category).map(t => (
                    <option key={t.id} value={t.id}>{t.company_name} ({t.trade_category})</option>
                  ))}
                </select>
                <input type="date" className="input text-sm" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} placeholder="Scheduled date" />
                <button className="btn-primary w-full text-sm" onClick={assignTrade} disabled={saving || !selectedTrade}>
                  {saving ? 'Saving…' : 'Assign Trade'}
                </button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {!['approved','cancelled'].includes(job.status) && (
            <div className="card p-4">
              <h3 className="font-medium text-gray-900 mb-3">Cancel Job</h3>
              <textarea className="input text-sm min-h-[60px]" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation…" />
              <button className="btn-danger w-full text-sm mt-2" onClick={cancelJob} disabled={saving}>Cancel Job</button>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
