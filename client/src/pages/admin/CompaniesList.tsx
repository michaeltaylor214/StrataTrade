import React, { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { StrataCompany } from '../../types';

export default function CompaniesList() {
  const [companies, setCompanies] = useState<StrataCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', contactName: '', contactEmail: '', contactPhone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<StrataCompany[]>('/schemes/companies').then(setCompanies).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/schemes/companies', form);
      setShowForm(false);
      setForm({ name: '', address: '', contactName: '', contactEmail: '', contactPhone: '' });
      load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: number, current: boolean) {
    await api.patch(`/schemes/companies/${id}`, { isActive: !current });
    load();
  }

  return (
    <PortalLayout title="Strata Companies">
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New Company'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create Company</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div><label className="label">Company name *</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
            <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
            <div><label className="label">Contact name</label><input className="input" value={form.contactName} onChange={e => setForm(f=>({...f,contactName:e.target.value}))} /></div>
            <div><label className="label">Contact email</label><input type="email" className="input" value={form.contactEmail} onChange={e => setForm(f=>({...f,contactEmail:e.target.value}))} /></div>
            <div><label className="label">Contact phone</label><input className="input" value={form.contactPhone} onChange={e => setForm(f=>({...f,contactPhone:e.target.value}))} /></div>
            <div className="flex items-end"><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button></div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Company</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Code</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-medium">{c.name}</td>
                  <td className="table-cell text-gray-500">{c.contact_name}<br/><span className="text-xs">{c.contact_email}</span></td>
                  <td className="table-cell font-mono text-xs">{c.company_code}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium ${c.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
