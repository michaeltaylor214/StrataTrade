import React, { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Job, JobDocument } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export default function BuildingMyBuilding() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [certs, setCerts] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const allJobs = await api.get<Job[]>('/jobs');
      setJobs(allJobs.filter(j => j.scheduled_date));

      const certDocs = await Promise.all(
        allJobs.filter(j => j.status === 'approved').map(j =>
          api.get<JobDocument[]>(`/jobs/${j.id}/documents`).catch(() => [] as JobDocument[])
        )
      );
      setCerts(certDocs.flat().filter(d => d.approved_by_admin && d.document_type === 'certificate'));
      setLoading(false);
    }
    load();
  }, [user]);

  const upcoming = jobs.filter(j => {
    const today = new Date().toISOString().split('T')[0];
    return j.scheduled_date && j.scheduled_date >= today && !['cancelled'].includes(j.status);
  }).sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime());

  return (
    <PortalLayout title="My Building">
      {loading ? <p className="text-gray-500">Loading…</p> : (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Upcoming Works</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming works scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(j => (
                  <div key={j.id} className="card p-4 flex items-center gap-4">
                    <div className="text-center bg-blue-50 rounded-lg p-3 w-16 shrink-0">
                      <p className="text-xs text-blue-500">{new Date(j.scheduled_date!).toLocaleDateString('en-AU', { month: 'short' })}</p>
                      <p className="text-2xl font-bold text-blue-700">{new Date(j.scheduled_date!).getDate()}</p>
                    </div>
                    <div>
                      <p className="font-medium capitalize">{j.obligation_name || j.job_type} works</p>
                      <p className="text-sm text-gray-500 capitalize">{j.trade_category || j.job_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Compliance Certificates</h2>
            {certs.length === 0 ? (
              <p className="text-gray-400 text-sm">No certificates available yet.</p>
            ) : (
              <div className="space-y-2">
                {certs.map(doc => (
                  <div key={doc.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{doc.original_filename}</p>
                      <p className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('en-AU')}</p>
                    </div>
                    <a href={`/uploads/${doc.file_path}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">Download</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
