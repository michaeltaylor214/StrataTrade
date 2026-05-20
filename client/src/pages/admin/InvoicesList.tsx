import React, { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api } from '../../services/api';
import { Invoice } from '../../types';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get<Invoice[]>('/invoices').then(setInvoices).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function exportCsv() {
    window.open('/api/invoices/export', '_blank');
  }

  async function updatePayment(id: number, field: 'trade' | 'client', value: string) {
    const body = field === 'trade' ? { tradePaymentStatus: value } : { clientPaymentStatus: value };
    await api.patch(`/invoices/${id}`, body);
    load();
  }

  const total = invoices.reduce((sum, i) => sum + Number(i.client_charge), 0);
  const unpaid = invoices.filter(i => i.client_payment_status !== 'paid').reduce((sum, i) => sum + Number(i.client_charge), 0);

  return (
    <PortalLayout title="Invoices">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 text-sm">
          <div><span className="text-gray-500">Total billed:</span> <span className="font-bold">${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></div>
          <div><span className="text-gray-500">Outstanding:</span> <span className="font-bold text-orange-600">${unpaid.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></div>
        </div>
        <button className="btn-secondary btn-sm" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <p className="p-6 text-gray-500">Loading…</p> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Scheme</th>
                <th className="table-header">Trade</th>
                <th className="table-header">Trade Cost</th>
                <th className="table-header">Margin</th>
                <th className="table-header">Client Charge</th>
                <th className="table-header">Trade Paid</th>
                <th className="table-header">Client Paid</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="table-row">
                  <td className="table-cell font-medium">{inv.scheme_name}</td>
                  <td className="table-cell text-gray-500">{inv.trade_name || '—'}</td>
                  <td className="table-cell">${Number(inv.trade_cost).toFixed(2)}</td>
                  <td className="table-cell">{inv.margin_percent}%</td>
                  <td className="table-cell font-semibold">${Number(inv.client_charge).toFixed(2)}</td>
                  <td className="table-cell">
                    <select className="input text-xs py-1" value={inv.trade_payment_status}
                      onChange={e => updatePayment(inv.id, 'trade', e.target.value)}>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                  <td className="table-cell">
                    <select className="input text-xs py-1" value={inv.client_payment_status}
                      onChange={e => updatePayment(inv.id, 'client', e.target.value)}>
                      <option value="unpaid">Unpaid</option>
                      <option value="invoiced">Invoiced</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={7} className="table-cell text-center text-gray-400">No invoices</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
