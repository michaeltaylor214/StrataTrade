import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job, JobDocument } from '../../types';

const STEPS = [
  { key: 'assigned',             label: 'Assigned',      num: 1 },
  { key: 'confirmed',            label: 'Confirmed',     num: 2 },
  { key: 'certificate_uploaded', label: 'Cert Uploaded', num: 3 },
  { key: 'approved',             label: 'Approved',      num: 4 },
];

function ProgressBar({ status }: { status: string }) {
  const stepIndex = STEPS.findIndex(s => s.key === status);
  if (stepIndex === -1) return null;
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const done    = i < stepIndex;
        const current = i === stepIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                done    ? 'bg-emerald-500 border-emerald-500 text-white' :
                current ? 'bg-blue-700 border-blue-700 text-white' :
                          'bg-white border-slate-200 text-slate-400'
              }`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                ) : step.num}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                done ? 'text-emerald-600' : current ? 'text-blue-700' : 'text-slate-400'
              }`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < stepIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function TradeJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [docs, setDocs] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const certRef  = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const [j, d] = await Promise.all([
        api.get<Job>(`/jobs/${id}`),
        api.get<JobDocument[]>(`/jobs/${id}/documents`).catch(() => [] as JobDocument[]),
      ]);
      setJob(j); setDocs(d); setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cert = certRef.current?.files?.[0];
    if (!cert) { setError('A compliance certificate file is required.'); return; }
    const photos = photosRef.current?.files;
    if (photos && photos.length > 10) { setError('Maximum 10 photos allowed.'); return; }
    const fd = new FormData();
    fd.append('certificate', cert);
    if (photos) Array.from(photos).forEach(p => fd.append('photos', p));
    fd.append('completionNotes', notes);
    setUploading(true);
    try {
      await api.upload(`/jobs/${id}/upload`, fd);
      navigate('/trade/jobs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  }

  const canUpload = job && ['confirmed', 'completed'].includes(job.status);
  const cert   = docs.find(d => d.document_type === 'certificate');
  const photos = docs.filter(d => d.document_type === 'photo');

  if (loading || !job) {
    return <PortalLayout><div className="text-slate-400">Loading…</div></PortalLayout>;
  }

  const scheduledStr = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not yet scheduled';

  return (
    <PortalLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link to="/trade/jobs" className="hover:text-blue-600 hover:underline">My Jobs</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
        <span className="text-slate-800 font-medium">{job.scheme_name}</span>
      </div>

      {/* Progress bar */}
      {!['cancelled', 'pending_assignment'].includes(job.status) && (
        <div className="card p-5 mb-6">
          <ProgressBar status={job.status} />
        </div>
      )}

      <div className="space-y-5 max-w-2xl">
        {/* ── Status alerts ──────────────────────────── */}
        {job.status === 'assigned' && (
          <div className="alert-amber flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <div>
              <p className="font-semibold">Awaiting your confirmation</p>
              <p className="text-sm mt-0.5 opacity-80">Check your email for a confirmation link, or contact the administrator.</p>
            </div>
          </div>
        )}

        {job.status === 'certificate_uploaded' && (
          <div className="alert-blue flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/>
            </svg>
            <div>
              <p className="font-semibold">Certificate under review</p>
              <p className="text-sm mt-0.5 opacity-80">Your certificate has been submitted and is awaiting admin approval.</p>
            </div>
          </div>
        )}

        {job.status === 'approved' && (
          <div className="alert-green flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p className="font-semibold">Job Complete — Certificate Approved ✓</p>
              <p className="text-sm mt-0.5 opacity-80">Well done! This job has been signed off.</p>
            </div>
          </div>
        )}

        {job.rejection_reason && (
          <div className="alert-red flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="font-semibold">Certificate Rejected — Please Resubmit</p>
              <p className="text-sm mt-1 opacity-90">{job.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* ── Job details card ───────────────────────── */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{job.scheme_name}</h1>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {job.scheme_address}
              </p>
            </div>
            <StatusBadge value={job.status} variant="job" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Job Type</p>
              <p className="font-semibold text-slate-900 capitalize">{job.job_type}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Scheduled Date</p>
              <p className="font-semibold text-slate-900">{scheduledStr}</p>
            </div>
            {job.obligation_name && (
              <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Works Required</p>
                <p className="font-semibold text-slate-900">{job.obligation_name}</p>
              </div>
            )}
            {job.admin_notes && (
              <div className="col-span-2 bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-amber-700 text-xs font-semibold uppercase tracking-wide mb-1">Admin Notes</p>
                <p className="text-slate-800 text-sm">{job.admin_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Existing docs ──────────────────────────── */}
        {(cert || photos.length > 0) && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Uploaded Documents</h3>
            {cert && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cert.original_filename}</p>
                    <p className="text-xs text-slate-400">Compliance Certificate</p>
                  </div>
                </div>
                <a href={`/uploads/${cert.file_path}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                  Open
                </a>
              </div>
            )}
            {photos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Site Photos ({photos.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map(p => (
                    <a key={p.id} href={`/uploads/${p.file_path}`} target="_blank" rel="noreferrer">
                      <img src={`/uploads/${p.file_path}`} alt="" className="h-20 w-full object-cover rounded-xl border border-slate-100 hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upload form ────────────────────────────── */}
        {canUpload && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Submit Completion Certificate</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload your compliance certificate to complete this job</p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {error && (
                <div className="alert-red text-sm">{error}</div>
              )}

              <div>
                <label className="label">Compliance Certificate <span className="text-red-500">*</span></label>
                <p className="text-xs text-slate-400 mb-1.5">PDF only · max 10MB</p>
                <input ref={certRef} type="file" accept=".pdf,application/pdf" className="input" required />
              </div>

              <div>
                <label className="label">Site Photos <span className="text-slate-400 font-normal">(optional)</span></label>
                <p className="text-xs text-slate-400 mb-1.5">JPG or PNG · up to 10 photos · max 10MB each</p>
                <input ref={photosRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple className="input" />
              </div>

              <div>
                <label className="label">Completion Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input min-h-24 resize-y"
                  placeholder="Describe works completed, any issues, recommendations…"
                />
              </div>

              <button type="submit" disabled={uploading} className="btn-primary w-full btn-lg">
                {uploading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Uploading…
                  </span>
                ) : 'Submit Certificate'}
              </button>
            </form>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
