import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { useAuth } from '../../hooks/useAuth';

export default function BuildingMaintenanceNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const formData = new FormData();
      formData.append('schemeId', String(user?.schemeId));
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (photos) Array.from(photos).forEach(f => formData.append('photos', f));

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('st_token')}` },
        body: formData,
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error);
      navigate('/building/maintenance');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <PortalLayout title="Submit Maintenance Request">
      <div className="max-w-lg">
        <div className="card p-6">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Issue title *</label>
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Broken gate in car park" />
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input min-h-[100px]" value={form.description} onChange={e => set('description', e.target.value)} required placeholder="Describe the problem, location, and any safety concerns…" />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low — Not urgent</option>
                <option value="medium">Medium — Should be fixed soon</option>
                <option value="high">High — Affecting residents</option>
                <option value="urgent">Urgent — Safety risk</option>
              </select>
            </div>
            <div>
              <label className="label">Photos (up to 5)</label>
              <input type="file" multiple accept="image/*" className="text-sm" onChange={e => setPhotos(e.target.files)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/building')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
