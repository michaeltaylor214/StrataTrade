import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { Job } from '../../types';

const JOB_STATUSES = ['pending_assignment','assigned','confirmed','completed','certificate_uploaded','approved','cancelled'];
const JOB_TYPES = ['compliance','maintenance','rectification'];

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const jobType = searchParams.get('jobType') || '';

  useEffect(() => {
    const params = new URLSearchParams();
    if (status && status !== 'overdue') params.set('status', status);
    if (jobType) params.set('jobType', jobType);

    api.get<Job[]>(`/jobs?${params.toString()}`)
      .then(data => {
        if (status === 'overdue') {
          const today = new Date().toISOString().split('T')[0];
          setJobs(data.filter(j => j.scheduled_date && j.scheduled_date < today && !['approved','cancelled'].includes(j.status)));
        } else {
          setJobs(data);
        }
      })
      .finally(() => setLoading(false));
  }, [status, jobType]);

  function setFilter(key: string, val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set(key, val); else next.delete(key);
      return next;
    });
  }

  return (
    <PortalLayout title="Jobs">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className="input w-44" value={status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {JOB_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          <option value="overdue">Overdue</option>
        </select>
        <select className="input w-40" value={jobType} onChange={e => setFilter('jobType', e.target.value)}>
          <option value="">All types</option>
          {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Link to="/admin/jobs/new" className="btn-primary ml-auto">+ Create Job</Link>
      </div>

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Scheme</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
                <th className="table-header">Trade</th>
                <th className="table-header">Scheduled</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="table-cell text-gray-400">#{j.id}</td>
                  <td className="table-cell font-medium">{j.scheme_name}</td>
                  <td className="table-cell capitalize">{j.job_type}</td>
                  <td className="table-cell"><StatusBadge value={j.status} variant="job" /></td>
                  <td className="table-cell text-gray-500">{j.trade_name || '—'}</td>
                  <td className="table-cell text-gray-500">
                    {j.scheduled_date ? new Date(j.scheduled_date).toLocaleDateString('en-AU') : '—'}
                  </td>
                  <td className="table-cell">
                    <Link to={`/admin/jobs/${j.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={7} className="table-cell text-center text-gray-400">No jobs</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
