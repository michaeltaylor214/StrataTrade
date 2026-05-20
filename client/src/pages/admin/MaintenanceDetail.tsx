import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { MaintenanceRequest, Trade } from '../../types';

export default function MaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [action, setAction] = useState<'create_job' | 'decline' | ''>('');
  const [tradeId, setTradeId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get<MaintenanceRequest>(`/maintenance/${id}`).then(setRequest);
    api.get<Trade[]>('/trades?isActive=true').then(setTrades);
  }, [id]);

  async function handleRespond() {
    if (!action) { setError('Select an action'); return; }
    if (action === 'decline' && !adminResponse) { setError('Provide a reason for declining'); return; }
    setSaving(true); setError('');
    try {
      await api.patch(`/maintenance/${id}/respond`, {
        action,
        adminResponse: adminResponse || null,
        tradeId: tradeId ? Number(tradeId) : null,
        scheduledDate: scheduledDate || null,
      });
      setDone(true);
      api.get<MaintenanceRequest>(`/maintenance/${id}`).then(setRequest);
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  }

  if (!request) return <PortalLayout><p className="text-gray-500">Loading…</p></PortalLayout>;

  return (
    <PortalLayout>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/maintenance" className="hover:underline">Maintenance</Link>
        <span>/</span>
        <span>{request.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">{request.title}</h1>
              <div className="flex gap-2">
                <StatusBadge value={request.priority} variant="priority" />
                <StatusBadge value={request.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><dt className="text-gray-500">Scheme</dt><dd className="font-medium">{request.scheme_name}</dd></div>
              <div><dt className="text-gray-500">Submitted by</dt><dd className="capitalize">{request.submitted_by_role.replace(/_/g,' ')}</dd></div>
              <div><dt className="text-gray-500">Date</dt><dd>{new Date(request.created_at).toLocaleDateString('en-AU')}</dd></div>
            </dl>
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.description}</p>
            </div>
            {request.photo_paths.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Photos</p>
                <div className="flex gap-2 flex-wrap">
                  {request.photo_paths.map((p, i) => (
                    <a key={i} href={`/uploads/${p}`} target="_blank" rel="noreferrer">
                      <img src={`/uploads/${p}`} alt="" className="h-24 w-32 object-cover rounded border" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {request.admin_response && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                <p className="text-gray-500 text-xs mb-1">Admin response</p>
                <p>{request.admin_response}</p>
              </div>
            )}
          </div>
        </div>

        {/* Response panel */}
        <div>
          {!['job_created','completed','declined'].includes(request.status) && !done ? (
            <div className="card p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Respond</h2>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="action" value="create_job" checked={action === 'create_job'} onChange={() => setAction('create_job')} />
                  Create a job for this request
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="action" value="decline" checked={action === 'decline'} onChange={() => setAction('decline')} />
                  Decline
                </label>
              </div>

              {action === 'create_job' && (
                <>
                  <div>
                    <label className="label text-xs">Assign trade (optional)</label>
                    <select className="input text-sm" value={tradeId} onChange={e => setTradeId(e.target.value)}>
                      <option value="">Assign later…</option>
                      {trades.map(t => <option key={t.id} value={t.id}>{t.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Scheduled date</label>
                    <input type="date" className="input text-sm" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label className="label text-xs">{action === 'decline' ? 'Reason for declining *' : 'Response note'}</label>
                <textarea className="input text-sm min-h-[70px]" value={adminResponse} onChange={e => setAdminResponse(e.target.value)} />
              </div>

              <button className="btn-primary w-full text-sm" onClick={handleRespond} disabled={saving || !action}>
                {saving ? 'Saving…' : 'Submit response'}
              </button>
            </div>
          ) : (
            <div className="card p-4">
              <p className="text-sm text-green-700 font-medium">Response recorded</p>
              <p className="text-xs text-gray-500 mt-1 capitalize">{request.status.replace(/_/g,' ')}</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
