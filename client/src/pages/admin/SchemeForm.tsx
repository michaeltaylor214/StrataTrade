import React, { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { StrataCompany, Scheme } from '../../types';

export default function SchemeForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [companies, setCompanies] = useState<StrataCompany[]>([]);
  const [form, setForm] = useState({
    strataCompanyId: '', name: '', address: '', buildingClass: '',
    numberOfLots: '', hasLift: false, hasPool: false, notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<StrataCompany[]>('/schemes/companies').then(setCompanies);
    if (isEdit) {
      api.get<Scheme>(`/schemes/${id}`).then(s => setForm({
        strataCompanyId: String(s.strata_company_id),
        name: s.name, address: s.address, buildingClass: s.building_class || '',
        numberOfLots: String(s.number_of_lots || ''), hasLift: s.has_lift, hasPool: s.has_pool,
        notes: s.notes || '',
      }));
    }
  }, [id, isEdit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const body = {
        strataCompanyId: Number(form.strataCompanyId),
        name: form.name, address: form.address, buildingClass: form.buildingClass,
        numberOfLots: form.numberOfLots ? Number(form.numberOfLots) : null,
        hasLift: form.hasLift, hasPool: form.hasPool, notes: form.notes,
      };
      if (isEdit) await api.patch(`/schemes/${id}`, body);
      else await api.post('/schemes', body);
      navigate('/admin/schemes');
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <PortalLayout title={isEdit ? 'Edit Scheme' : 'New Scheme'}>
      <div className="max-w-2xl">
        <div className="card p-6">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Strata company *</label>
              <select className="input" value={form.strataCompanyId} onChange={e => set('strataCompanyId', e.target.value)} required>
                <option value="">Select…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Scheme name *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div><label className="label">Building class</label><input className="input" value={form.buildingClass} onChange={e => set('buildingClass', e.target.value)} placeholder="Class 2" /></div>
            </div>
            <div><label className="label">Address *</label><input className="input" value={form.address} onChange={e => set('address', e.target.value)} required /></div>
            <div><label className="label">Number of lots</label><input type="number" className="input" value={form.numberOfLots} onChange={e => set('numberOfLots', e.target.value)} /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.hasLift} onChange={e => set('hasLift', e.target.checked)} className="rounded" />
                Has lift
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.hasPool} onChange={e => set('hasPool', e.target.checked)} className="rounded" />
                Has pool
              </label>
            </div>
            <div><label className="label">Notes</label><textarea className="input min-h-[80px]" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create scheme'}</button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/admin/schemes')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
