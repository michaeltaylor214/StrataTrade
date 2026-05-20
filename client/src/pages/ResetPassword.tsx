import React, { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    const res = await fetch('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json() as { error?: string };
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Reset failed'); return; }
    navigate('/login?reset=success');
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-sm w-full">
          <p className="text-red-600">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm mt-2 block">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm card p-8">
        <h2 className="text-xl font-semibold mb-6">Set new password</h2>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  );
}
