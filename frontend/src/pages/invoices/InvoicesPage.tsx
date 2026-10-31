import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import {
  Receipt,
  Play,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Printer,
  Download,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  CreditCard,
  FileMinus,
  BellRing,
} from 'lucide-react';
import { CheckoutModal } from '../../components/invoices/CheckoutModal.tsx';
import { CreditNoteModal } from '../../components/invoices/CreditNoteModal.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  customerId: string;
  billingPeriod: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  notes: string | null;
  customer?: { id: string; name: string; email: string };
  subscription?: { id: string; subscriptionNumber: string };
  lines?: InvoiceLine[];
  payments?: any[];
}

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkoutInvoice, setCheckoutInvoice] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<any>(null);
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Billing Run modal & state
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isBillingRunning, setIsBillingRunning] = useState(false);
  const [billingResult, setBillingResult] = useState<any>(null);

  // Invoice Detail & Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          page,
          limit: 15,
          status: statusFilter || undefined,
          isOverdue: onlyOverdue ? 'true' : undefined,
          search: search || undefined,
        },
      });
      setInvoices(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, onlyOverdue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleOpenDetail = async (inv: Invoice) => {
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setSelectedInvoice(res.data.invoice);
      setEmailStatus(null);
      setEmailPreviewUrl(null);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunBilling = async () => {
    setIsBillingRunning(true);
    setBillingResult(null);
    try {
      const res = await api.post('/invoices/manual-run', { targetDate: new Date() });
      setBillingResult(res.data.result);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Billing run failed');
    } finally {
      setIsBillingRunning(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/invoices/${selectedInvoice.id}/confirm`);
      setSelectedInvoice({ ...selectedInvoice, status: 'CONFIRMED' });
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!selectedInvoice) return;
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/invoices/${selectedInvoice.id}/cancel`);
      setSelectedInvoice({ ...selectedInvoice, status: 'CANCELLED', outstandingAmount: 0 });
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      const res = await api.post('/subscriptions/dunning/remind', { invoiceId });
      toast.success(
        'Overdue reminder dispatched!',
        `Sent notice to ${res.data.customerEmail} for Invoice ${res.data.invoiceNumber}.`
      );
      if (res.data.emailResult?.previewUrl) {
        window.open(res.data.emailResult.previewUrl, '_blank');
      }
    } catch (err: any) {
      toast.error('Failed to send reminder', err.response?.data?.error || err.message);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    setEmailStatus(null);
    setEmailPreviewUrl(null);
    try {
      const res = await api.post(`/invoices/${selectedInvoice.id}/send`);
      setEmailStatus(res.data.message);
      if (res.data.previewUrl) setEmailPreviewUrl(res.data.previewUrl);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to email invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice) return;
    window.open(`/api/invoices/${selectedInvoice.id}/pdf`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string, dueDate: string, outstandingAmount: number) => {
    const isPastDue = new Date(dueDate) < new Date() && outstandingAmount > 0 && status === 'CONFIRMED';

    if (isPastDue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
        </span>
      );
    }

    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            DRAFT
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            CONFIRMED
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            PAID
          </span>
        );
      case 'CANCELLED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
            CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" /> Invoices & Recurring Billing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated billing engine with idempotency protection and complete invoice lifecycle management
          </p>
        </div>

        <button
          onClick={() => {
            setBillingResult(null);
            setIsBillingModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
        >
          <Play className="w-4 h-4 fill-white text-white" /> Run Billing Engine Now
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by INV-00000, customer, or SUB reference..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {['', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setOnlyOverdue(false);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st && !onlyOverdue
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st || 'All Statuses'}
            </button>
          ))}

          <button
            onClick={() => {
              setOnlyOverdue(!onlyOverdue);
              setStatusFilter('');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              onlyOverdue
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Only
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => handleOpenDetail(inv)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {inv.customer?.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {inv.subscription?.subscriptionNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {inv.billingPeriod}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inv.status, inv.dueDate, inv.outstandingAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString()}
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
                      <span className="text-xs text-indigo-600 font-semibold hover:underline">
                        View &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={15}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal: Manual Billing Run */}
      <Modal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        title="Execute Recurring Billing Cycle"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            This operation scans all <strong className="text-emerald-700">ACTIVE</strong> and non-paused subscriptions where the billing date is due, generates invoice drafts, and computes taxes and discounts.
          </p>

          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-indigo-900">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Idempotency Protection Active
            </span>
            <span className="text-[11px] text-slate-600 block">
              The database composite constraint <code>@@unique([subscriptionId, billingPeriod])</code> strictly ensures no subscription is ever billed twice in the same billing cycle.
            </span>
          </div>

          {billingResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 text-emerald-900">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Billing Run Completed
              </div>
              <div className="text-xs">
                Invoices Generated: <strong>{billingResult.createdCount}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Already Billed / Skipped: <strong>{billingResult.skippedCount}</strong>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBillingModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isBillingRunning}
              onClick={handleRunBilling}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {isBillingRunning ? 'Running Billing Cycle...' : 'Run Billing Now'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Online Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        invoice={checkoutInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Credit Note Modal */}
      <CreditNoteModal
        isOpen={isCreditNoteOpen}
        onClose={() => setIsCreditNoteOpen(false)}
        invoice={creditNoteInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Modal: Invoice Detail, Print & PDF */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Invoice: ${selectedInvoice?.invoiceNumber}`}
        maxWidth="2xl"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs">
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl no-print">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Status:</span>
                {getStatusBadge(selectedInvoice.status, selectedInvoice.dueDate, selectedInvoice.outstandingAmount)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedInvoice.status === 'DRAFT' && (
                  <button
                    disabled={actionLoading}
                    onClick={handleConfirmInvoice}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Invoice
                  </button>
                )}

                <button
                  disabled={actionLoading}
                  onClick={handleSendEmail}
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" /> Email Customer
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>

                {selectedInvoice.outstandingAmount > 0 && selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <button
                    onClick={() => {
                      setCheckoutInvoice(selectedInvoice);
                      setIsCheckoutOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition flex items-center gap-1 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay Now
                  </button>
                )}

                {selectedInvoice.status !== 'CANCELLED' && (
                  <button
                    onClick={() => {
                      setCreditNoteInvoice(selectedInvoice);
                      setIsCreditNoteOpen(true);
                    }}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold transition flex items-center gap-1"
                  >
                    <FileMinus className="w-3.5 h-3.5" /> Issue Credit
                  </button>
                )}

                {selectedInvoice.outstandingAmount > 0 && selectedInvoice.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleSendReminder(selectedInvoice.id)}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-lg font-semibold transition flex items-center gap-1"
                    title="Send Overdue Dunning Email with 1-Click Pay Link"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-600" /> Remind
                  </button>
                )}

                {selectedInvoice.status !== 'CANCELLED' && selectedInvoice.status !== 'PAID' && (
                  <button
                    disabled={actionLoading}
                    onClick={handleCancelInvoice}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold transition flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Email Notification Notice */}
            {emailStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1 no-print">
                <div className="text-emerald-800 font-semibold">{emailStatus}</div>
                {emailPreviewUrl && (
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline text-[11px] block"
                  >
                    View in Ethereal Test Inbox &rarr;
                  </a>
                )}
              </div>
            )}

            {/* Printable Invoice Sheet */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-indigo-600">BRIGHTLOOP SOFTWARE</h2>
                  <p className="text-slate-500 text-[11px] mt-0.5">Automated Cloud & Subscription Billing</p>
                  <p className="text-slate-400 text-[10px]">support@brightloop.io | https://brightloop.io</p>
                </div>

                <div className="text-right">
                  <h3 className="text-lg font-bold text-slate-900">INVOICE</h3>
                  <div className="text-slate-600 font-mono font-semibold">{selectedInvoice.invoiceNumber}</div>
                  <div className="text-slate-400 text-[11px]">
                    Period: <strong className="text-slate-700">{selectedInvoice.billingPeriod}</strong>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Billed To & Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Billed To</span>
                  <div className="font-bold text-slate-900">{selectedInvoice.customer?.name}</div>
                  <div className="text-slate-500">{selectedInvoice.customer?.email}</div>
                </div>

                <div className="text-right space-y-0.5">
                  <div>
                    <span className="text-slate-400">Issue Date: </span>
                    <strong className="text-slate-700">{new Date(selectedInvoice.issueDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Due Date: </span>
                    <strong className="text-slate-700">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Subscription Ref: </span>
                    <span className="font-mono text-indigo-600 font-semibold">
                      {selectedInvoice.subscription?.subscriptionNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lines Table */}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-right">Tax (18%)</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{line.description}</td>
                      <td className="py-2.5 px-3 text-center">{line.quantity}</td>
                      <td className="py-2.5 px-3 text-right">${line.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">${line.taxAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">${line.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax Total (GST):</span>
                    <span>${selectedInvoice.taxTotal.toFixed(2)}</span>
                  </div>
                  {selectedInvoice.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Promo Discount:</span>
                      <span>-${selectedInvoice.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span>${selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium pt-1">
                    <span>Paid Amount:</span>
                    <span>${selectedInvoice.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                    <span>Outstanding Balance:</span>
                    <span className={selectedInvoice.outstandingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      ${selectedInvoice.outstandingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payments History on this invoice */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block mb-2">
                    Payment Receipts Recorded
                  </span>
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    {selectedInvoice.payments.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center text-slate-700">
                        <span>
                          <strong className="font-mono text-indigo-600">{p.paymentNumber}</strong> ({p.paymentMethod}) on{' '}
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </span>
                        <span className="font-bold text-emerald-700">+${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Online Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        invoice={checkoutInvoice}
        onSuccess={fetchInvoices}
      />

      {/* Credit Note Modal */}
      <CreditNoteModal
        isOpen={isCreditNoteOpen}
        onClose={() => setIsCreditNoteOpen(false)}
        invoice={creditNoteInvoice}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};


