import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job, JobDocument } from '../../types';

export default function TradeJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [docs, setDocs] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const certRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const [j, d] = await Promise.all([
        api.get<Job>(`/jobs/${id}`),
        api.get<JobDocument[]>(`/jobs/${id}/documents`).catch(() => [] as JobDocument[]),
      ]);
      setJob(j);
      setDocs(d);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const cert = certRef.current?.files?.[0];
    if (!cert) { setError('A certificate file is required.'); return; }
    const photos = photosRef.current?.files;
    if (photos && photos.length > 10) { setError('Maximum 10 photos allowed.'); return; }

    const fd = new FormData();
    fd.append('certificate', cert);
    if (photos) {
      Array.from(photos).forEach(p => fd.append('photos', p));
    }
    fd.append('completionNotes', notes);

    setUploading(true);
    try {
      await api.upload(`/jobs/${id}/upload`, fd);
      navigate('/trade/jobs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const canUpload = job && ['confirmed', 'completed'].includes(job.status);
  const cert = docs.find(d => d.document_type === 'certificate');
  const photos = docs.filter(d => d.document_type === 'photo');

  return (
    <PortalLayout title="Job Details">
      {loading || !job ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-6 max-w-2xl">
          <div className="card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{job.scheme_name}</h2>
                <p className="text-gray-500 text-sm">{job.scheme_address}</p>
              </div>
              <StatusBadge value={job.status} variant="job" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Job Type</p>
                <p className="font-medium capitalize">{job.job_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Scheduled Date</p>
                <p className="font-medium">
                  {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Not yet scheduled'}
                </p>
              </div>
              {job.obligation_name && (
                <div className="col-span-2">
                  <p className="text-gray-500">Works</p>
                  <p className="font-medium">{job.obligation_name}</p>
                </div>
              )}
              {job.admin_notes && (
                <div className="col-span-2">
                  <p className="text-gray-500">Notes</p>
                  <p className="text-sm">{job.admin_notes}</p>
                </div>
              )}
            </div>

            {job.status === 'assigned' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                This job is awaiting your confirmation. Please check your email for a confirmation link, or contact your administrator.
              </div>
            )}

            {job.status === 'certificate_uploaded' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Your certificate has been uploaded and is awaiting admin review.
              </div>
            )}

            {job.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                Certificate approved. This job is complete.
              </div>
            )}

            {job.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                <p className="font-medium">Certificate rejected</p>
                <p className="mt-1">{job.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* Existing documents */}
          {(cert || photos.length > 0) && (
            <div className="card p-6 space-y-3">
              <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
              {cert && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{cert.original_filename}</p>
                    <p className="text-xs text-gray-400">Certificate</p>
                  </div>
                  <a href={`/uploads/${cert.file_path}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">View</a>
                </div>
              )}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map(p => (
                    <a key={p.id} href={`/uploads/${p.file_path}`} target="_blank" rel="noreferrer">
                      <img src={`/uploads/${p.file_path}`} alt="" className="h-20 w-28 object-cover rounded border hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload form */}
          {canUpload && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Submit Completion Certificate</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div>
                  <label className="label">Compliance Certificate <span className="text-red-500">*</span></label>
                  <p className="text-xs text-gray-400 mb-1">PDF only, max 10MB</p>
                  <input ref={certRef} type="file" accept=".pdf,application/pdf" className="input" required />
                </div>

                <div>
                  <label className="label">Site Photos (optional)</label>
                  <p className="text-xs text-gray-400 mb-1">JPG or PNG, up to 10 photos, max 10MB each</p>
                  <input ref={photosRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple className="input" />
                </div>

                <div>
                  <label className="label">Completion Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input min-h-24 resize-y"
                    placeholder="Describe the works completed, any issues encountered, recommendations…"
                  />
                </div>

                <button type="submit" disabled={uploading} className="btn-primary w-full">
                  {uploading ? 'Uploading…' : 'Submit Certificate'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
