import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Scheme } from '../../types';

export default function StrataSchemesList() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Scheme[]>('/schemes').then(setSchemes).finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout title="My Schemes">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <p className="text-gray-500">Loading…</p> : schemes.map(s => (
          <Link key={s.id} to={`/strata/schemes/${s.id}`} className="card p-5 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-gray-900">{s.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{s.address}</p>
            <div className="flex gap-3 mt-3 text-xs text-gray-500">
              {s.number_of_lots && <span>{s.number_of_lots} lots</span>}
              {s.has_lift && <span>Lift</span>}
              {s.has_pool && <span>Pool</span>}
              {s.building_manager_name && <span>BM: {s.building_manager_name}</span>}
            </div>
          </Link>
        ))}
        {!loading && schemes.length === 0 && (
          <p className="text-gray-400 col-span-2">No schemes assigned to your account yet.</p>
        )}
      </div>
    </PortalLayout>
  );
}
