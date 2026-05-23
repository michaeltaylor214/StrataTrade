import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const CATEGORIES = ['Electrical', 'Fire Safety', 'Plumbing', 'Lift', 'Pool', 'Building/General'];

export default function RegisterTrade() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', companyName: '', abn: '', tradeCategory: '',
    licenceNumber: '', insuranceExpiryDate: '', email: '', password: '', confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [licenceVerified, setLicenceVerified] = useState<boolean | null>(null);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const data = await api.post<{ message: string; licenceVerified: boolean; licenceStatus: string }>(
        '/auth/register/trade',
        {
          fullName: form.fullName, companyName: form.companyName, abn: form.abn,
          tradeCategory: form.tradeCategory, licenceNumber: form.licenceNumber,
          insuranceExpiryDate: form.insuranceExpiryDate, email: form.email, password: form.password,
        }
      );
      setLicenceVerified(data.licenceVerified ?? null);
      navigate(`/login?registered=trade&verified=${data.licenceVerified}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-lg card p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-700">StrataTrade</h1>
          <h2 className="text-lg font-semibold mt-2">Register as a Trade Contractor</h2>
          <p className="text-sm text-gray-500 mt-1">Your account will be reviewed before activation.</p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full name *</label>
              <input className="input" value={form.fullName} onChange={e => set('fullName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Company name *</label>
              <input className="input" value={form.companyName} onChange={e => set('companyName', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ABN *</label>
              <input className="input" value={form.abn} onChange={e => set('abn', e.target.value)} required placeholder="12 345 678 901" />
            </div>
            <div>
              <label className="label">Trade category *</label>
              <select className="input" value={form.tradeCategory} onChange={e => set('tradeCategory', e.target.value)} required>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">NSW Contractor Licence No. *</label>
              <input
                className="input"
                value={form.licenceNumber}
                onChange={e => set('licenceNumber', e.target.value)}
                placeholder="e.g. 123456C"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Verified against NSW Fair Trading register</p>
            </div>
            <div>
              <label className="label">Insurance expiry</label>
              <input type="date" className="input" value={form.insuranceExpiryDate} onChange={e => set('insuranceExpiryDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Email address *</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
            </div>
            <div>
              <label className="label">Confirm password *</label>
              <input type="password" className="input" value={form.confirm} onChange={e => set('confirm', e.target.value)} required minLength={8} />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Registering…' : 'Register'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
