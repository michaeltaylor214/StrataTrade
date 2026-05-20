import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthUser } from '../types';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { token: string; user: AuthUser; forcePasswordChange?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      const user: AuthUser = { ...data.user, forcePasswordChange: data.forcePasswordChange };
      login(data.token, user);

      if (data.forcePasswordChange) {
        navigate('/change-password');
        return;
      }

      const redirectMap: Record<string, string> = {
        admin:            '/admin',
        strata_manager:   '/strata',
        building_manager: '/building',
        trade:            '/trade',
      };
      navigate(redirectMap[user.role] || '/login');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">StrataTrade</h1>
          <p className="text-gray-500 mt-1 text-sm">Compliance & Maintenance Management</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline block">
              Forgot your password?
            </Link>
            <Link to="/register/trade" className="text-sm text-gray-500 hover:underline block">
              Register as a trade contractor
            </Link>
            <Link to="/register/strata" className="text-sm text-gray-500 hover:underline block">
              Register as a strata manager
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
