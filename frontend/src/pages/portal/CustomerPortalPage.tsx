import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../components/layout/Navbar.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { ProrationModal } from '../../components/subscriptions/ProrationModal.tsx';
import { CheckoutModal } from '../../components/invoices/CheckoutModal.tsx';
import { useToast } from '../../context/ToastContext.tsx';
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
  Zap,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  HardDrive,
  Users,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const CustomerPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [prorationSub, setProrationSub] = useState<any>(null);
  const [isProrationOpen, setIsProrationOpen] = useState(false);

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        api.get('/portal/subscriptions'),
        api.get('/portal/invoices'),
      ]);
      setSubscriptions(subRes.data.data || []);
      setInvoices(invRes.data.data || []);

      // Check if payInvoice query param is in URL
      const payInvId = searchParams.get('payInvoice');
      if (payInvId && invRes.data.data) {
        const target = invRes.data.data.find((inv: any) => inv.id === payInvId);
        if (target && target.outstandingAmount > 0) {
          setCheckoutInvoice(target);
          setIsCheckoutOpen(true);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load portal data', err.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [searchParams]);

  const handleTogglePause = async (sub: any) => {
    if (!sub.plan.allowPause) {
      toast.error('Action restricted', `Pausing is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }
    try {
      const res = await api.post(`/subscriptions/${sub.id}/pause`);
      toast.success(res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      toast.error('Failed to toggle pause', err.response?.data?.error);
    }
  };

  const handleRenew = async (sub: any) => {
    if (!sub.plan.allowRenewal) {
      toast.error('Action restricted', `Auto-renewal is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }
    try {
      const res = await api.post(`/subscriptions/${sub.id}/renew`);
      toast.success(res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      toast.error('Failed to renew', err.response?.data?.error);
    }
  };

  const handleClose = async (sub: any) => {
    if (!sub.plan.allowEarlyClose) {
      toast.error('Action restricted', `Early cancellation is not allowed by the '${sub.plan.name}' plan policy.`);
      return;
    }
    if (!window.confirm('Are you sure you want to cancel and close your subscription?')) return;

    try {
      const res = await api.post(`/subscriptions/${sub.id}/close`);
      toast.info('Subscription Closed', res.data.message);
      fetchCustomerData();
    } catch (err: any) {
      toast.error('Failed to close subscription', err.response?.data?.error);
    }
  };

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.outstandingAmount > 0
  );
  const primarySub = subscriptions[0];

  return (
    <div className="min-h-screen bg-[#edf2f7] w-full">
      <Navbar />

      <main className="w-full px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        {/* Welcome & Account Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Customer Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage your active recurring subscriptions, live consumption meters, and billing history.
            </p>
          </div>

          {/* Quick Pay Outstanding CTA */}
          {unpaidInvoices.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/80 px-4 py-2.5 rounded-xl shadow-subtle animate-in slide-in-from-right-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-900">
                  {unpaidInvoices.length} Unpaid Invoice(s) Pending
                </div>
                <div className="text-xs text-amber-700 font-mono font-bold">
                  Total Due: $
                  {unpaidInvoices.reduce((acc, i) => acc + i.outstandingAmount, 0).toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => {
                  setCheckoutInvoice(unpaidInvoices[0]);
                  setIsCheckoutOpen(true);
                }}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              >
                Pay Now
              </button>
            </div>
          )}
        </div>

        {/* Primary Subscription Hero Card */}
        {primarySub && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-elevated relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono tracking-widest text-indigo-300 uppercase">
                    Primary Service Tier
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      primarySub.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {primarySub.status}
                    {primarySub.isPaused && ' (PAUSED)'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    {primarySub.plan?.name}
                  </h2>
                  <span className="text-2xl font-bold font-mono text-indigo-300">
                    ${primarySub.totalAmount?.toFixed(2)}
                    <span className="text-xs text-slate-400 font-sans ml-1">
                      / {primarySub.plan?.billingPeriod?.toLowerCase()}
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Next Renewal: </span>
                    <strong className="text-white font-mono">
                      {primarySub.nextBillingDate
                        ? new Date(primarySub.nextBillingDate).toLocaleDateString()
                        : 'Active / Continuous'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span>Terms: </span>
                    <strong className="text-white">{primarySub.paymentTerms}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Ref: </span>
                    <strong className="text-indigo-300 font-mono">{primarySub.subscriptionNumber}</strong>
                  </div>
                </div>
              </div>

              {/* Actions Pod */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setProrationSub(primarySub);
                    setIsProrationOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition"
                >
                  <Zap className="w-4 h-4" />
                  Upgrade / Change Tier
                </button>

                {primarySub.plan?.allowPause && (
                  <button
                    onClick={() => handleTogglePause(primarySub)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition"
                  >
                    {primarySub.isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause
                      </>
                    )}
                  </button>
                )}

                {primarySub.plan?.allowRenewal && (
                  <button
                    onClick={() => handleRenew(primarySub)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Renew
                  </button>
                )}

                {primarySub.plan?.allowEarlyClose && (
                  <button
                    onClick={() => handleClose(primarySub)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Consumption Meters Grid */}
            <div className="mt-8 pt-6 border-t border-indigo-900/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>API Invocations</span>
                  </div>
                  <span className="font-mono font-bold text-white">28,400 / 50,000</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2 rounded-full" style={{ width: '56.8%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">56.8% monthly quota used</span>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cloud Storage</span>
                  </div>
                  <span className="font-mono font-bold text-white">42 GB / 100 GB</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-2 rounded-full" style={{ width: '42%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">42.0% storage capacity allocated</span>
              </div>

              <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Team User Seats</span>
                  </div>
                  <span className="font-mono font-bold text-white">12 / 20 Seats</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">8 additional seats available</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`pb-3 text-sm font-bold transition flex items-center gap-2 relative ${
                activeTab === 'subscriptions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              My Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-3 text-sm font-bold transition flex items-center gap-2 relative ${
                activeTab === 'invoices'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Invoices & Billing History ({invoices.length})
              {unpaidInvoices.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Subscriptions List */}
        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle hover:shadow-card transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {sub.subscriptionNumber}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        sub.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sub.status === 'CONFIRMED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{sub.plan?.name}</h3>
                  <div className="text-xl font-extrabold text-indigo-600 font-mono mt-1">
                    ${sub.totalAmount.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      / {sub.plan?.billingPeriod?.toLowerCase()}
                    </span>
                  </div>

                  {/* Lines preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Included Package Line Items
                    </span>
                    {sub.lines && sub.lines.length > 0 ? (
                      sub.lines.map((l: any) => (
                        <div key={l.id} className="text-xs text-slate-600 flex justify-between">
                          <span>
                            {l.quantity}x {l.product?.name}
                          </span>
                          <span className="font-mono">${l.totalAmount.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400">Core plan base features</div>
                    )}
                  </div>
                </div>

                {/* Sub Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    Next bill:{' '}
                    {sub.nextBillingDate
                      ? new Date(sub.nextBillingDate).toLocaleDateString()
                      : 'None'}
                  </span>
                  <button
                    onClick={() => {
                      setProrationSub(sub);
                      setIsProrationOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Change Plan <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Invoices List */}
        {activeTab === 'invoices' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Billing Period</th>
                    <th className="py-3.5 px-4">Issue / Due Date</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {inv.billingPeriod}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <div>Issued: {new Date(inv.issueDate).toLocaleDateString()}</div>
                          <div className="text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">
                            ${inv.totalAmount.toFixed(2)}
                          </div>
                          {inv.outstandingAmount > 0 && inv.status !== 'PAID' && (
                            <div className="text-xs font-mono text-rose-600 font-semibold">
                              Due: ${inv.outstandingAmount.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'CONFIRMED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {inv.outstandingAmount > 0 && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setCheckoutInvoice(inv);
                                setIsCheckoutOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
                            >
                              <CreditCard className="w-3 h-3" /> Pay Now
                            </button>
                          )}
                          <a
                            href={`/api/invoices/${inv.id}/pdf`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                            target="_blank"
                            rel="noreferrer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                        No invoices generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Proration Modal */}
      <ProrationModal
        isOpen={isProrationOpen}
        onClose={() => setIsProrationOpen(false)}
        subscription={prorationSub}
        onSuccess={fetchCustomerData}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        invoice={checkoutInvoice}
        onSuccess={fetchCustomerData}
      />
    </div>
  );
};
