import React, { useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';

export default function SubmitQuote() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState({ amount: '', notes: '', validUntil: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid quote amount'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/submit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(form.amount), notes: form.notes, validUntil: form.validUntil || null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || 'Submission failed'); return; }
      setSubmitted(true);
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setLoading(false); }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-green-700">Quote submitted</h2>
          <p className="text-gray-500 mt-2 text-sm">Thank you. We will be in touch if your quote is accepted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-blue-700 mb-1">StrataTrade</h1>
        <h2 className="text-lg font-semibold mb-1">Submit a Quote</h2>
        <p className="text-sm text-gray-500 mb-6">No login required. Fill in your quote details below.</p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Quote amount (AUD) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input pl-7"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes / scope of works</label>
            <textarea
              className="input min-h-[100px]"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Describe what is included in this quote…"
            />
          </div>
          <div>
            <label className="label">Quote valid until</label>
            <input
              type="date"
              className="input"
              value={form.validUntil}
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit quote'}
          </button>
        </form>
      </div>
    </div>
  );
}
