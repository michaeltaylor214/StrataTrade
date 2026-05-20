import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { BuildingAudit, AuditFinding, Scheme } from '../../types';

const SEVERITIES = ['low','medium','high','critical'];
const CATEGORIES = ['Electrical','Fire Safety','Plumbing','Lift','Pool','Building/General'];

export default function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [audit, setAudit] = useState<BuildingAudit | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);

  // New audit form
  const [newAuditForm, setNewAuditForm] = useState({
    schemeId: searchParams.get('schemeId') || '',
    auditDate: new Date().toISOString().split('T')[0],
  });

  // Edit audit form
  const [editForm, setEditForm] = useState({ overallCondition: '', summaryNotes: '' });

  // New finding form
  const [findingForm, setFindingForm] = useState({
    tradeCategory: '', locationInBuilding: '', description: '',
    severity: 'medium', requiresRectification: false,
  });
  const [findingPhotos, setFindingPhotos] = useState<FileList | null>(null);
  const [savingFinding, setSavingFinding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Scheme[]>('/schemes').then(setSchemes);
    if (!isNew) {
      api.get<BuildingAudit>(`/audits/${id}`).then(a => {
        setAudit(a);
        setFindings(a.findings || []);
        setEditForm({ overallCondition: a.overall_condition || '', summaryNotes: a.summary_notes || '' });
      });
    }
  }, [id, isNew]);

  async function createAudit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const result = await api.post<BuildingAudit>('/audits', newAuditForm);
      window.location.href = `/admin/audits/${result.id}`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function saveAudit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.patch<BuildingAudit>(`/audits/${id}`, editForm);
      setAudit(result);
    } finally { setSaving(false); }
  }

  async function submitAudit() {
    if (!window.confirm('Submit this audit? This will notify strata managers and cannot be undone.')) return;
    setSaving(true);
    try {
      await api.patch(`/audits/${id}`, { status: 'submitted' });
      window.location.reload();
    } finally { setSaving(false); }
  }

  async function addFinding(e: FormEvent) {
    e.preventDefault();
    setSavingFinding(true); setError('');
    try {
      const form = new FormData();
      Object.entries(findingForm).forEach(([k, v]) => form.append(k, String(v)));
      if (findingPhotos) Array.from(findingPhotos).forEach(f => form.append('photos', f));

      const res = await fetch(`/api/audits/${id}/findings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('st_token')}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error);
      const finding = await res.json() as AuditFinding;
      setFindings(f => [...f, finding]);
      setFindingForm({ tradeCategory: '', locationInBuilding: '', description: '', severity: 'medium', requiresRectification: false });
      setFindingPhotos(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSavingFinding(false); }
  }

  async function deleteFinding(fid: number) {
    if (!window.confirm('Delete this finding?')) return;
    await api.delete(`/audits/findings/${fid}`);
    setFindings(f => f.filter(x => x.id !== fid));
  }

  if (isNew) {
    return (
      <PortalLayout title="New Building Audit">
        <div className="max-w-md card p-6">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={createAudit} className="space-y-4">
            <div>
              <label className="label">Scheme *</label>
              <select className="input" value={newAuditForm.schemeId} onChange={e => setNewAuditForm(f => ({ ...f, schemeId: e.target.value }))} required>
                <option value="">Select scheme…</option>
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audit date *</label>
              <input type="date" className="input" value={newAuditForm.auditDate} onChange={e => setNewAuditForm(f => ({ ...f, auditDate: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Creating…' : 'Start Audit'}</button>
          </form>
        </div>
      </PortalLayout>
    );
  }

  if (!audit) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  const canEdit = audit.status === 'draft';

  return (
    <PortalLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/admin/audits" className="hover:underline">Audits</Link>
            <span>/</span>
            <span>{audit.scheme_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Building Audit — {audit.scheme_name}</h1>
          <p className="text-gray-500">{new Date(audit.audit_date).toLocaleDateString('en-AU')} · {audit.conducted_by_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge value={audit.status} />
          <Link to={`/admin/audits/${id}/report`} className="btn-secondary btn-sm">View Report</Link>
          {canEdit && (
            <button className="btn-primary btn-sm" onClick={submitAudit} disabled={saving}>Submit Audit</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Edit audit details */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Overall Assessment</h2>
            <form onSubmit={saveAudit} className="space-y-3">
              <div>
                <label className="label">Overall condition</label>
                <select className="input" value={editForm.overallCondition} onChange={e => setEditForm(f => ({ ...f, overallCondition: e.target.value }))} disabled={!canEdit}>
                  <option value="">Select…</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="label">Summary notes</label>
                <textarea className="input min-h-[100px]" value={editForm.summaryNotes} onChange={e => setEditForm(f => ({ ...f, summaryNotes: e.target.value }))} disabled={!canEdit} />
              </div>
              {canEdit && (
                <button type="submit" className="btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              )}
            </form>
          </div>

          {/* Findings */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Findings ({findings.length})</h2>

            {findings.map(f => (
              <div key={f.id} className="border border-gray-200 rounded-md p-4 mb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge value={f.severity} variant="severity" />
                    <span className="text-sm font-medium text-gray-700">{f.trade_category}</span>
                    {f.requires_rectification && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Rectification required</span>}
                  </div>
                  {canEdit && (
                    <button className="text-xs text-red-500 hover:underline" onClick={() => deleteFinding(f.id)}>Remove</button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-0.5">{f.location_in_building}</p>
                <p className="text-sm">{f.description}</p>
                {f.photo_paths.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {f.photo_paths.map((p, i) => (
                      <a key={i} href={`/uploads/${p}`} target="_blank" rel="noreferrer">
                        <img src={`/uploads/${p}`} alt="" className="h-16 w-16 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add finding form */}
            {canEdit && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Finding</h3>
                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
                <form onSubmit={addFinding} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Trade category *</label>
                      <select className="input text-sm" value={findingForm.tradeCategory} onChange={e => setFindingForm(f => ({ ...f, tradeCategory: e.target.value }))} required>
                        <option value="">Select…</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Severity *</label>
                      <select className="input text-sm" value={findingForm.severity} onChange={e => setFindingForm(f => ({ ...f, severity: e.target.value }))}>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Location in building</label>
                    <input className="input text-sm" value={findingForm.locationInBuilding} onChange={e => setFindingForm(f => ({ ...f, locationInBuilding: e.target.value }))} placeholder="e.g. Level 3 Switchboard Room" />
                  </div>
                  <div>
                    <label className="label text-xs">Description *</label>
                    <textarea className="input text-sm min-h-[70px]" value={findingForm.description} onChange={e => setFindingForm(f => ({ ...f, description: e.target.value }))} required />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="rectReq" checked={findingForm.requiresRectification} onChange={e => setFindingForm(f => ({ ...f, requiresRectification: e.target.checked }))} className="rounded" />
                    <label htmlFor="rectReq" className="text-sm cursor-pointer">Requires rectification</label>
                  </div>
                  <div>
                    <label className="label text-xs">Photos (up to 5)</label>
                    <input type="file" multiple accept="image/*" className="text-sm" onChange={e => setFindingPhotos(e.target.files)} />
                  </div>
                  <button type="submit" className="btn-primary btn-sm" disabled={savingFinding}>
                    {savingFinding ? 'Adding…' : 'Add Finding'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card p-4 text-sm">
            <p className="font-medium text-gray-700 mb-2">Summary</p>
            <p className="text-gray-500">{findings.length} total findings</p>
            <p className="text-gray-500">{findings.filter(f => f.requires_rectification).length} require rectification</p>
            <p className="text-gray-500">{findings.filter(f => f.severity === 'critical').length} critical</p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
