import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function ChangePassword() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Minimum 8 characters'); return; }

    setLoading(true);
    try {
      await api.post('/auth/password/change', { currentPassword: current, newPassword: password });
      // Update stored user to clear force_password_change flag
      if (user) {
        const updatedUser = { ...user, forcePasswordChange: false };
        login(localStorage.getItem('st_token')!, updatedUser);
      }
      const redirectMap: Record<string, string> = {
        admin: '/admin', strata_manager: '/strata', building_manager: '/building', trade: '/trade',
      };
      navigate(redirectMap[user?.role || 'admin']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm card p-8">
        <h2 className="text-xl font-semibold mb-2">Set a new password</h2>
        <p className="text-sm text-gray-500 mb-6">You must change your password before continuing.</p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input type="password" className="input" value={current} onChange={e => setCurrent(e.target.value)} required />
          </div>
          <div>
            <label className="label">New password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
