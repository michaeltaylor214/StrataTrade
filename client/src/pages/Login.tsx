import React, { useState, FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthUser } from '../types';
import { api } from '../services/api';

function Logo() {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
      <rect x="2" y="14" width="17" height="28" rx="2" fill="#1D4ED8"/>
      <rect x="5"  y="18" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="18" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="5"  y="25" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="25" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="5"  y="32" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="12" y="32" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="23" y="6" width="19" height="36" rx="2" fill="#2563EB"/>
      <rect x="26" y="10" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="10" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="26" y="17" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="17" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="26" y="24" width="4" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <rect x="33" y="24" width="5" height="3.5" rx="0.5" fill="white" opacity="0.85"/>
      <circle cx="12" cy="36" r="8" fill="#F59E0B"/>
      <path d="M8.5 36l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const registeredAs    = searchParams.get('registered');
  const licenceVerified = searchParams.get('verified');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: AuthUser; forcePasswordChange?: boolean }>(
        '/auth/login', { email, password }
      );
      const user: AuthUser = { ...data.user, forcePasswordChange: data.forcePasswordChange };
      login(data.token, user);
      if (data.forcePasswordChange) { navigate('/change-password'); return; }
      const map: Record<string, string> = {
        admin: '/admin', strata_manager: '/strata', building_manager: '/building', trade: '/trade',
      };
      navigate(map[user.role] || '/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Logo />
            <span className="text-3xl font-bold text-slate-900 tracking-tight">StrataTrade</span>
          </div>
          <p className="text-slate-500 text-sm">Strata Compliance & Trade Management</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Sign in to your account</h2>

          {/* Registration success banners */}
          {registeredAs === 'trade' && (
            <div className={`mb-5 rounded-xl px-4 py-3 text-sm border ${
              licenceVerified === 'true'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {licenceVerified === 'true'
                ? '✓ Registration successful — your NSW contractor licence has been verified. Your account is under review.'
                : 'Registration received — your account is under review. Ensure your contractor licence and name match your NSW Fair Trading records.'}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 space-y-2 text-center">
            <Link to="/forgot-password" className="block text-sm text-blue-600 hover:underline font-medium">
              Forgot your password?
            </Link>
            <div className="flex justify-center gap-4 pt-1">
              <Link to="/register/trade" className="text-xs text-slate-500 hover:text-blue-600 hover:underline">
                Register as trade contractor
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/register/strata" className="text-xs text-slate-500 hover:text-blue-600 hover:underline">
                Register as strata manager
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
