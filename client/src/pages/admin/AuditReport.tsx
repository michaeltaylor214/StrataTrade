import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { api } from '../../services/api';
import { BuildingAudit } from '../../types';

export default function AuditReport() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<BuildingAudit | null>(null);

  useEffect(() => {
    api.get<BuildingAudit>(`/audits/${id}`).then(setAudit);
  }, [id]);

  if (!audit) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Print button — hidden when printing */}
      <div className="no-print flex items-center gap-3 px-8 py-4 border-b border-gray-200 bg-gray-50">
        <button className="btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
        <button className="btn-secondary" onClick={() => window.history.back()}>Back</button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 print-full">
        {/* Header */}
        <div className="border-b-2 border-blue-700 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-blue-700">StrataTrade</h1>
              <p className="text-gray-500 text-sm mt-1">Building Audit Report</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p className="font-semibold text-gray-900">{audit.scheme_name}</p>
              <p>{audit.scheme_address}</p>
              <p>Audit date: {new Date(audit.audit_date).toLocaleDateString('en-AU')}</p>
              <p>Conducted by: {audit.conducted_by_name}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Overall Assessment</h2>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-500">Building condition</p>
              <p className="font-semibold capitalize">{audit.overall_condition || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Findings requiring rectification</p>
              <p className="font-semibold">{(audit.findings || []).filter(f => f.requires_rectification).length} of {(audit.findings || []).length}</p>
            </div>
          </div>
          {audit.summary_notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-1">Summary</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{audit.summary_notes}</p>
            </div>
          )}
        </div>

        {/* Findings table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Findings ({(audit.findings || []).length})</h2>
          {(audit.findings || []).length === 0 ? (
            <p className="text-gray-500 text-sm">No findings recorded.</p>
          ) : (
            <div className="space-y-4">
              {(audit.findings || []).map((f, i) => (
                <div key={f.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                    <StatusBadge value={f.severity} variant="severity" />
                    <span className="text-sm font-semibold">{f.trade_category}</span>
                    {f.requires_rectification && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Rectification required</span>
                    )}
                    {f.requires_rectification && (
                      <span className="text-xs text-gray-500 ml-auto capitalize">{f.rectification_status?.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  {f.location_in_building && (
                    <p className="text-xs text-gray-500 mb-1">Location: {f.location_in_building}</p>
                  )}
                  <p className="text-sm text-gray-700">{f.description}</p>

                  {f.photo_paths.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {f.photo_paths.map((p, pi) => (
                        <img key={pi} src={`/uploads/${p}`} alt={`Finding ${i + 1} photo ${pi + 1}`}
                          className="h-24 w-32 object-cover rounded border border-gray-200" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
          <span>StrataTrade — Compliance & Maintenance Management</span>
          <span>Generated {new Date().toLocaleDateString('en-AU')}</span>
        </div>
      </div>
    </div>
  );
}
