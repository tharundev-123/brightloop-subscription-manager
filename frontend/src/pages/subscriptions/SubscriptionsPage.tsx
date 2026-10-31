import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Pause,
  Play,
  RotateCw,
  XCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Zap,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { ProrationModal } from '../../components/subscriptions/ProrationModal.tsx';
import { useToast } from '../../context/ToastContext.tsx';

interface SubscriptionLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  totalAmount: number;
  product?: { id: string; name: string; type: string };
  variant?: { id: string; attributeValue: string; extraPrice: number } | null;
}

interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: string;
  startDate: string;
  expiryDate: string | null;
  nextBillingDate: string | null;
  paymentTerms: string;
  totalAmount: number;
  isPaused: boolean;
  dunningStatus?: string;
  notes: string | null;
  customer?: { id: string; name: string; email: string };
  plan?: {
    id: string;
    name: string;
    price: number;
    billingPeriod: string;
    allowPause: boolean;
    allowRenewal: boolean;
    allowEarlyClose: boolean;
  };
  lines?: SubscriptionLine[];
}

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prorationSub, setProrationSub] = useState<any>(null);
  const [isProrationOpen, setIsProrationOpen] = useState(false);
  const [isDunningRunning, setIsDunningRunning] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Subscription Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCustId, setNewCustId] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [newTerms, setNewTerms] = useState('IMMEDIATE');
  const [newNotes, setNewNotes] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [customLines, setCustomLines] = useState<any[]>([]);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/subscriptions', {
        params: {
          page,
          limit: 15,
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });
      setSubscriptions(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [pRes, cRes, prRes] = await Promise.all([
        api.get('/plans'),
        api.get('/users?role=CUSTOMER&limit=100'),
        api.get('/products?limit=50'),
      ]);
      setPlans(pRes.data.data);
      setCustomers(cRes.data.data);
      setProducts(prRes.data.data);
      if (pRes.data.data.length > 0) setNewPlanId(pRes.data.data[0].id);
      if (cRes.data.data.length > 0) setNewCustId(cRes.data.data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubscriptions();
  };

  const handleOpenDetail = async (sub: Subscription) => {
    try {
      const res = await api.get(`/subscriptions/${sub.id}`);
      setSelectedSub(res.data.subscription);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // State Transition Actions
  const handleTransition = async (targetStatus: string) => {
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/subscriptions/${selectedSub.id}/status`, { targetStatus });
      setSelectedSub(res.data.subscription);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${selectedSub.id}/pause`);
      setSelectedSub(res.data.subscription);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Pause/resume failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!selectedSub) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${selectedSub.id}/renew`);
      setSelectedSub(res.data.subscription);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Renewal failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSub = async () => {
    if (!selectedSub) return;
    if (!window.confirm('Are you sure you want to close this subscription?')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${selectedSub.id}/close`);
      setSelectedSub(res.data.subscription);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Close failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCustomLine = () => {
    if (!selectedProdId) return;
    const p = products.find((x) => x.id === selectedProdId);
    if (!p) return;

    setCustomLines([
      ...customLines,
      {
        productId: p.id,
        name: p.name,
        quantity: parseInt(lineQty) || 1,
        unitPrice: p.salesPrice,
      },
    ]);
    setSelectedProdId('');
    setLineQty('1');
  };

  const handleCreateCustomSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subscriptions', {
        customerId: newCustId,
        planId: newPlanId,
        paymentTerms: newTerms,
        notes: newNotes,
        lines: customLines,
      });

      setIsNewModalOpen(false);
      setCustomLines([]);
      setNewNotes('');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create subscription');
    }
  };

  const handleRunDunning = async () => {
    try {
      setIsDunningRunning(true);
      const res = await api.post('/subscriptions/dunning/run');
      toast.success(
        'Dunning Scan Completed!',
        `Overdue: ${res.data.report.overdueInvoicesFound}, Reminders: ${res.data.report.remindersSent}, Past Due: ${res.data.report.subscriptionsPastDue}, Suspended: ${res.data.report.subscriptionsSuspended}`
      );
      fetchSubscriptions();
    } catch (err: any) {
      toast.error('Dunning scan failed', err.response?.data?.error || err.message);
    } finally {
      setIsDunningRunning(false);
    }
  };

  const getStatusBadge = (status: string, isPaused?: boolean, dunningStatus?: string) => {
    if (dunningStatus === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 text-white shadow-sm">
          <ShieldAlert className="w-2.5 h-2.5" /> SUSPENDED
        </span>
      );
    }
    if (dunningStatus === 'PAST_DUE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="w-2.5 h-2.5" /> PAST DUE
        </span>
      );
    }
    if (isPaused) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Pause className="w-2.5 h-2.5" /> PAUSED
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
      case 'QUOTATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            QUOTATION
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            CONFIRMED
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ACTIVE
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" /> Subscriptions Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforcing strict status lifecycle (Draft &rarr; Quotation &rarr; Confirmed &rarr; Active &rarr; Closed)
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Custom Subscription
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SUB-00000 or customer name..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <div className="flex gap-2">
          {['', 'DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No subscriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sub #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan / Cycle</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => handleOpenDetail(sub)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {sub.subscriptionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{sub.customer?.name}</div>
                      <div className="text-[11px] text-slate-400">{sub.customer?.email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {sub.plan?.name}
                      <span className="text-[10px] text-slate-400 block uppercase">
                        {sub.plan?.billingPeriod}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(sub.status, sub.isPaused, sub.dunningStatus)}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${sub.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs text-indigo-600 font-semibold hover:underline">
                        Manage &rarr;
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

      {/* Modal: Subscription Detail & State Machine Controller */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Subscription Details: ${selectedSub?.subscriptionNumber}`}
        maxWidth="xl"
      >
        {selectedSub && (
          <div className="space-y-6 text-xs">
            {/* Status Progress Stepper */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Subscription Lifecycle Stage
              </span>
              <div className="flex items-center justify-between relative">
                {['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((step, idx) => {
                  const stages = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];
                  const currentIndex = stages.indexOf(selectedSub.status);
                  const isPassed = idx <= currentIndex;
                  const isCurrent = step === selectedSub.status;

                  return (
                    <div key={step} className="flex flex-col items-center z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] transition ${
                          isCurrent
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md'
                            : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPassed && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] font-semibold mt-1 ${
                          isCurrent ? 'text-indigo-600' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Customer</span>
                <span className="font-semibold text-slate-900">{selectedSub.customer?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Plan</span>
                <span className="font-semibold text-slate-900">{selectedSub.plan?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Cadence</span>
                <span className="font-semibold text-indigo-600 uppercase">{selectedSub.plan?.billingPeriod}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Payment Terms</span>
                <span className="font-medium text-slate-700">{selectedSub.paymentTerms}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Next Billing</span>
                <span className="font-medium text-slate-700">
                  {selectedSub.nextBillingDate ? new Date(selectedSub.nextBillingDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Total Cycle Cost</span>
                <span className="font-bold text-slate-900 text-sm">${selectedSub.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Lines Breakdown */}
            <div>
              <span className="font-bold text-slate-800 text-xs block mb-2">Subscription Lines</span>
              <table className="w-full text-xs text-left bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                <thead className="bg-slate-100 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Tax (18%)</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {selectedSub.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="p-2 font-medium text-slate-800">
                        {line.product?.name}
                        {line.variant && (
                          <span className="text-indigo-600 text-[10px] block">
                            Variant: {line.variant.attributeValue} (+${line.variant.extraPrice})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">{line.quantity}</td>
                      <td className="p-2 text-right">${line.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-right">${line.taxAmount.toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold">${line.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lifecycle Action Buttons (Strict Status Engine) */}
            <div className="pt-4 border-t border-slate-200">
              <span className="font-bold text-slate-700 block mb-2">Next Stage Actions</span>
              <div className="flex flex-wrap gap-2">
                {selectedSub.status === 'DRAFT' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTransition('QUOTATION')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Send Formal Quotation
                  </button>
                )}

                {selectedSub.status === 'QUOTATION' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTransition('CONFIRMED')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Quotation
                  </button>
                )}

                {selectedSub.status === 'CONFIRMED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleTransition('ACTIVE')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" /> Activate Subscription
                  </button>
                )}

                {selectedSub.status === 'ACTIVE' && selectedSub.plan?.allowPause && (
                  <button
                    disabled={actionLoading}
                    onClick={handleTogglePause}
                    className={`px-3 py-2 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                      selectedSub.isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {selectedSub.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {selectedSub.isPaused ? 'Resume Billing' : 'Pause Subscription'}
                  </button>
                )}

                {selectedSub.status === 'ACTIVE' && selectedSub.plan?.allowRenewal && (
                  <button
                    disabled={actionLoading}
                    onClick={handleRenew}
                    className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Renew (Extend Expiry)
                  </button>
                )}

                {selectedSub.status !== 'CLOSED' && (
                  <button
                    disabled={actionLoading}
                    onClick={handleCloseSub}
                    className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold transition flex items-center gap-1.5 ml-auto"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Close Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create Custom Subscription */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Create Custom Subscription"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomSubscription} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
              <select
                required
                value={newCustId}
                onChange={(e) => setNewCustId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan *</label>
              <select
                required
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price}/{p.billingPeriod.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={newTerms}
                onChange={(e) => setNewTerms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="NET_15">Net 15</option>
                <option value="NET_30">Net 30</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Contract terms, custom SLA..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Add Lines */}
          <div className="pt-3 border-t border-slate-200">
            <span className="font-semibold text-slate-800 block mb-2">Add Products/Addons</span>
            <div className="flex gap-2">
              <select
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.salesPrice})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
                placeholder="Qty"
                className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomLine}
                className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-xs font-semibold"
              >
                + Add
              </button>
            </div>

            {customLines.length > 0 && (
              <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {customLines.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-700">
                    <span>{l.quantity}x {l.name}</span>
                    <span className="font-semibold">${(l.quantity * l.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save as Draft
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
