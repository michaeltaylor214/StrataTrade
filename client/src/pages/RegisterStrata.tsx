import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AuthUser } from '../types';

export default function RegisterStrata() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', companyCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const data = await api.post<{ token: string; user: { id: number; name: string; email: string; strata_company_id: number } }>(
        '/auth/register/strata',
        { name: form.name, email: form.email, password: form.password, companyCode: form.companyCode }
      );
      const authUser: AuthUser = {
        userId: data.user.id,
        role: 'strata_manager',
        email: data.user.email,
        strataCompanyId: data.user.strata_company_id,
      };
      login(data.token, authUser);
      navigate('/strata');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm card p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-700">StrataTrade</h1>
          <h2 className="text-lg font-semibold mt-2">Strata Manager Registration</h2>
          <p className="text-sm text-gray-500 mt-1">You need a company code from your administrator.</p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Email address</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Company code</label>
            <input className="input" value={form.companyCode} onChange={e => set('companyCode', e.target.value.toUpperCase())} required placeholder="e.g. HVST-001" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="password" className="input" value={form.confirm} onChange={e => set('confirm', e.target.value)} required minLength={8} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Registering…' : 'Register'}
          </button>
          <p className="text-center text-sm text-gray-500">
            <Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
