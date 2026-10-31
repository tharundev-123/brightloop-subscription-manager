import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../components/layout/Navbar.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import {
  CalendarCheck,
  Receipt,
  Download,
  Printer,
  Pause,
  Play,
  RotateCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Print/View Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        api.get('/portal/subscriptions'),
        api.get('/portal/invoices'),
      ]);
      setSubscriptions(subRes.data.data);
      setInvoices(invRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const handleTogglePause = async (sub: any) => {
    if (!sub.plan.allowPause) {
      alert(`Pausing is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }

    try {
      const res = await api.post(`/subscriptions/${sub.id}/pause`);
      setActionMessage(res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle pause');
    }
  };

  const handleRenew = async (sub: any) => {
    if (!sub.plan.allowRenewal) {
      alert(`Auto-renewal is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }

    try {
      const res = await api.post(`/subscriptions/${sub.id}/renew`);
      setActionMessage(res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to renew');
    }
  };

  const handleClose = async (sub: any) => {
    if (!sub.plan.allowEarlyClose) {
      alert(`Early cancellation is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }

    if (!window.confirm('Are you sure you want to cancel and close your subscription?')) return;

    try {
      const res = await api.post(`/subscriptions/${sub.id}/close`);
      setActionMessage(res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to close subscription');
    }
  };

  const handleDownloadPdf = (invId: string) => {
    window.open(`/api/invoices/${invId}/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Customer Welcome Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Customer Account Portal
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Account: <strong className="text-slate-800">{user?.email}</strong> &bull; Access your subscriptions and tax invoices
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'subscriptions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'invoices'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Invoices ({invoices.length})
            </button>
          </div>
        </div>

        {/* Global Toast Message */}
        {actionMessage && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <span className="font-semibold">{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* TAB 1: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading your subscriptions...</div>
            ) : subscriptions.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                You have no subscriptions active currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-indigo-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="font-mono font-bold text-indigo-600 text-sm block">
                            {sub.subscriptionNumber}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{sub.plan.name}</h3>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              sub.isPaused
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : sub.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.isPaused ? 'PAUSED' : sub.status}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase block font-medium mt-1">
                            {sub.plan.billingPeriod}
                          </span>
                        </div>
                      </div>

                      {/* Product Lines Breakdown */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1.5 my-3">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Included Software & Addons
                        </span>
                        {sub.lines.map((l: any) => (
                          <div key={l.id} className="flex justify-between items-center text-slate-700">
                            <span>
                              {l.quantity}x {l.product?.name}
                              {l.variant && (
                                <span className="text-indigo-600 text-[10px] block">
                                  Variant: {l.variant.attributeValue}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-slate-900">${l.totalAmount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 py-2 border-t border-slate-100">
                        <div>
                          <span>Billing Cadence: </span>
                          <strong className="text-slate-700 capitalize">{sub.plan.billingPeriod.toLowerCase()}</strong>
                        </div>
                        <div className="text-right">
                          <span>Next Bill: </span>
                          <strong className="text-slate-700">
                            {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Customer Action Controls (Governed by Plan Policies) */}
                    <div className="pt-4 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Total / Cycle</span>
                        <span className="text-base font-extrabold text-slate-900">${sub.totalAmount.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Pause button: only if plan allows */}
                        {sub.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleTogglePause(sub)}
                            disabled={!sub.plan.allowPause}
                            title={sub.plan.allowPause ? 'Pause or resume billing' : 'Pausing is not allowed for this plan'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              !sub.plan.allowPause
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : sub.isPaused
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {sub.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            {sub.isPaused ? 'Resume' : 'Pause'}
                          </button>
                        )}

                        {/* Renew button: only if plan allows */}
                        {sub.plan.allowRenewal && sub.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRenew(sub)}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-indigo-200"
                            title="Extend expiration date"
                          >
                            <RotateCw className="w-3 h-3" /> Renew
                          </button>
                        )}

                        {/* Cancel / Early close: only if plan allows */}
                        {sub.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleClose(sub)}
                            disabled={!sub.plan.allowEarlyClose}
                            title={sub.plan.allowEarlyClose ? 'Cancel subscription early' : 'Early close is disallowed by plan'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              !sub.plan.allowEarlyClose
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading your invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">No billing invoices found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4 text-center">Receipt & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {inv.billingPeriod}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'CONFIRMED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          ${inv.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {inv.outstandingAmount > 0 ? (
                            <span className="text-rose-600">${inv.outstandingAmount.toFixed(2)}</span>
                          ) : (
                            <span className="text-emerald-600">$0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadPdf(inv.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition flex items-center gap-1"
                              title="Download PDF Invoice"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold transition flex items-center gap-1"
                              title="Print View"
                            >
                              <Printer className="w-3 h-3" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Printable Invoice Modal for Customer */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={`Invoice: ${selectedInvoice?.invoiceNumber}`}
        maxWidth="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-indigo-600 text-base">BRIGHTLOOP SOFTWARE</h3>
                <span className="text-slate-400 text-[10px]">support@brightloop.io</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900 block">{selectedInvoice.invoiceNumber}</span>
                <span className="text-slate-500">Period: {selectedInvoice.billingPeriod}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-700 block">Line Items</span>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] text-slate-500">
                  <tr>
                    <th className="p-1.5">Description</th>
                    <th className="p-1.5 text-center">Qty</th>
                    <th className="p-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map((line: any) => (
                    <tr key={line.id}>
                      <td className="p-1.5">{line.description}</td>
                      <td className="p-1.5 text-center">{line.quantity}</td>
                      <td className="p-1.5 text-right font-medium">${line.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-500">Total Billed:</span>
              <span className="text-sm font-bold text-slate-900">${selectedInvoice.totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => handleDownloadPdf(selectedInvoice.id)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

