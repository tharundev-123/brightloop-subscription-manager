import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import {
  CreditCard,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  DollarSign,
  Receipt,
  User,
} from 'lucide-react';

interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    outstandingAmount: number;
    status: string;
    customer?: { id: string; name: string; email: string };
  };
  recordedBy?: { id: string; name: string };
}

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  dueDate: string;
  customer?: { id: string; name: string; email: string };
  subscription?: { id: string; subscriptionNumber: string };
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'outstanding' | 'overdue'>('payments');

  // Payments State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payTotal, setPayTotal] = useState(0);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [paySearch, setPaySearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Invoices State
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OutstandingInvoice[]>([]);
  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [invTotalPages, setInvTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payments', {
        params: {
          page: payPage,
          limit: 15,
          search: paySearch || undefined,
          method: selectedMethod || undefined,
        },
      });
      setPayments(res.data.data);
      setPayTotal(res.data.meta.total);
      setPayTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutstanding = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payments/outstanding', {
        params: { page: invPage, limit: 15 },
      });
      setOutstandingInvoices(res.data.data);
      setInvTotal(res.data.meta.total);
      setInvTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverdue = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payments/overdue', {
        params: { page: invPage, limit: 15 },
      });
      setOverdueInvoices(res.data.data);
      setInvTotal(res.data.meta.total);
      setInvTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'outstanding') {
      fetchOutstanding();
    } else {
      fetchOverdue();
    }
  }, [activeTab, payPage, invPage, selectedMethod]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayPage(1);
    fetchPayments();
  };

  const handleOpenRecordPayment = (inv: any) => {
    setTargetInvoice(inv);
    setAmount(String(inv.outstandingAmount));
    setNotes('');
    setRecordSuccess(null);
    setIsRecordModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvoice) return;
    setIsSubmitting(true);

    try {
      const res = await api.post('/payments', {
        invoiceId: targetInvoice.id,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate,
        notes,
      });

      setRecordSuccess(res.data.message);
      if (activeTab === 'payments') fetchPayments();
      if (activeTab === 'outstanding') fetchOutstanding();
      if (activeTab === 'overdue') fetchOverdue();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" /> Payments & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record partial or full settlements, monitor outstanding balances, and track overdue accounts
          </p>
        </div>

        <button
          onClick={() => {
            setActiveTab('outstanding');
          }}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
        >
          <Receipt className="w-4 h-4" /> View Invoices to Collect
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Payments History Log
        </button>
        <button
          onClick={() => {
            setActiveTab('outstanding');
            setInvPage(1);
          }}
          className={`pb-3 px-1 border-b-2 transition ${
            activeTab === 'outstanding'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Outstanding Invoices
        </button>
        <button
          onClick={() => {
            setActiveTab('overdue');
            setInvPage(1);
          }}
          className={`pb-3 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'overdue'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-rose-600'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Overdue Invoices
        </button>
      </div>

      {/* TAB 1: ALL PAYMENTS LOG */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
                placeholder="Search by PAY-00000, invoice #, or customer name..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </form>

            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setPayPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Methods (Card, UPI, Bank, Cash)</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Loading payments log...</div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">No payment records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {p.paymentNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {p.invoice?.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {p.invoice?.customer?.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.recordedBy?.name || 'Staff'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          +${p.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={payPage}
              totalPages={payTotalPages}
              total={payTotal}
              limit={15}
              onPageChange={(p) => setPayPage(p)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: OUTSTANDING INVOICES */}
      {activeTab === 'outstanding' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading outstanding invoices...</div>
          ) : outstandingInvoices.length === 0 ? (
            <div className="py-12 text-center text-emerald-700 text-sm font-semibold">
              All invoices are paid in full! Zero outstanding balances.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Invoice Total</th>
                    <th className="py-3 px-4 text-right">Already Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outstandingInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {inv.customer?.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-800">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        ${inv.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        ${inv.outstandingAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenRecordPayment(inv)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Record Payment &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={invPage}
            totalPages={invTotalPages}
            total={invTotal}
            limit={15}
            onPageChange={(p) => setInvPage(p)}
          />
        </div>
      )}

      {/* TAB 3: OVERDUE INVOICES LIST */}
      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="bg-rose-50 p-4 border-b border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Overdue Invoices Requiring Follow-Up
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
              {invTotal} Delinquent Invoice(s)
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading overdue accounts...</div>
          ) : overdueInvoices.length === 0 ? (
            <div className="py-12 text-center text-emerald-700 text-sm font-semibold">
              No overdue invoices! All payments are current.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Days Overdue</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueInvoices.map((inv) => {
                    const diffDays = Math.ceil(
                      (new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr key={inv.id} className="hover:bg-rose-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {inv.customer?.name}
                        </td>
                        <td className="py-3 px-4 text-rose-600 font-medium">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            {diffDays} Day(s) Overdue
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600 text-sm">
                          ${inv.outstandingAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenRecordPayment(inv)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                          >
                            Collect Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={invPage}
            totalPages={invTotalPages}
            total={invTotal}
            limit={15}
            onPageChange={(p) => setInvPage(p)}
          />
        </div>
      )}

      {/* Modal: Record Payment */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Record Payment for ${targetInvoice?.invoiceNumber}`}
        maxWidth="md"
      >
        {recordSuccess ? (
          <div className="space-y-4 text-center text-xs">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="font-bold text-slate-900 text-sm">{recordSuccess}</div>
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-800">{targetInvoice?.customer?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Total:</span>
                <strong className="text-slate-800">${targetInvoice?.totalAmount?.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <strong className="text-rose-600">${targetInvoice?.outstandingAmount?.toFixed(2)}</strong>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Payment Amount ($) *</label>
                <button
                  type="button"
                  onClick={() => setAmount(String(targetInvoice?.outstandingAmount))}
                  className="text-indigo-600 hover:underline text-[11px] font-semibold"
                >
                  Pay Full Balance ($ {targetInvoice?.outstandingAmount?.toFixed(2)})
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                required
                max={targetInvoice?.outstandingAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Note / Reference</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Transaction ID, check #, bank ref..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

