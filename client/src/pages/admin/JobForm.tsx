import React, { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Scheme, Trade } from '../../types';

export default function JobForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState({
    schemeId: searchParams.get('schemeId') || '',
    jobType: 'compliance',
    tradeId: '',
    scheduledDate: '',
    adminNotes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Scheme[]>('/schemes').then(setSchemes);
    api.get<Trade[]>('/trades?isActive=true').then(setTrades);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/jobs', {
        schemeId: Number(form.schemeId),
        jobType: form.jobType,
        tradeId: form.tradeId ? Number(form.tradeId) : null,
        scheduledDate: form.scheduledDate || null,
        adminNotes: form.adminNotes || null,
      });
      navigate('/admin/jobs');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  return (
    <PortalLayout title="Create Job">
      <div className="max-w-lg">
        <div className="card p-6">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Scheme *</label>
              <select className="input" value={form.schemeId} onChange={e => set('schemeId', e.target.value)} required>
                <option value="">Select scheme…</option>
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job type *</label>
              <select className="input" value={form.jobType} onChange={e => set('jobType', e.target.value)}>
                <option value="compliance">Compliance</option>
                <option value="maintenance">Maintenance</option>
                <option value="rectification">Rectification</option>
              </select>
            </div>
            <div>
              <label className="label">Assign trade (optional)</label>
              <select className="input" value={form.tradeId} onChange={e => set('tradeId', e.target.value)}>
                <option value="">Assign later…</option>
                {trades.map(t => <option key={t.id} value={t.id}>{t.company_name} — {t.trade_category}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Scheduled date</label>
              <input type="date" className="input" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Admin notes</label>
              <textarea className="input min-h-[80px]" value={form.adminNotes} onChange={e => set('adminNotes', e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Job'}</button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/admin/jobs')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
