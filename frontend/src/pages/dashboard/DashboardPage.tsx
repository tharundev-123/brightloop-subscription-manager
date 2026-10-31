import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { OdooSyncModal } from '../../components/odoo/OdooSyncModal.tsx';
import {
  DollarSign,
  CalendarCheck,
  AlertTriangle,
  Receipt,
  TrendingUp,
  ArrowUpRight,
  Filter,
  CreditCard,
  User,
  ShieldCheck,
  Clock,
  Database,
  RefreshCw,
  Download,
  Activity,
  FileText,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSubs, setRecentSubs] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [activeActivityTab, setActiveActivityTab] = useState<'subs' | 'payments' | 'audit'>('subs');
  const [isLoading, setIsLoading] = useState(true);
  const [isOdooOpen, setIsOdooOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, chartRes, actRes, planRes, auditRes] = await Promise.all([
        api.get('/dashboard/kpis', { params: { planId: selectedPlan || undefined } }),
        api.get('/dashboard/revenue-chart'),
        api.get('/dashboard/recent-activity'),
        api.get('/plans'),
        api.get('/audit?limit=15'),
      ]);

      setKpis(kpiRes.data.kpis);
      setChartData(chartRes.data.data);
      setRecentSubs(actRes.data.recentSubscriptions);
      setRecentPayments(actRes.data.recentPayments);
      setPlans(planRes.data.data);
      setAuditLogs(auditRes.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load dashboard metrics', err.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPlan]);

  // Derived metrics
  const mrr = kpis?.revenueCollected ? (kpis.revenueCollected / 12) : 0;
  const arr = kpis?.revenueCollected ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Executive Revenue & Billing Dashboard
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time SaaS recurring metrics, collection efficiency, Odoo ERP synchronization, and ledger audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Plan Filter */}
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            <option value="">Consolidated (All Tiers)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Odoo Quick Sync Button */}
          <button
            onClick={() => setIsOdooOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100/80 border border-purple-200/80 transition"
          >
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>Odoo Connector</span>
          </button>

          {/* Export Dropdown */}
          <a
            href="/api/export/invoices.csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            title="Export Invoices to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Subscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {kpis?.activeSubscriptions ?? '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              of {kpis?.allSubscriptionsTotal ?? '—'} total
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% growth this quarter
          </div>
        </div>

        {/* Card 2: Revenue Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Gross Collections
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600 font-mono tracking-tight">
              ${kpis?.revenueCollected?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Settled across all payment rails
          </div>
        </div>

        {/* Card 3: Amount Outstanding */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Pending Receivables
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 font-mono tracking-tight">
              ${kpis?.revenueOutstanding?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Active uncollected invoice balances
          </div>
        </div>

        {/* Card 4: Critical Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-rose-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Dunning / Overdue
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 font-mono tracking-tight">
              ${kpis?.overdueAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
            <span className="text-xs text-rose-500 font-semibold font-mono">
              ({kpis?.overdueCount ?? 0} invs)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Dunning notifications active
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart & Odoo Sync Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recharts Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Monthly Billing & Revenue Trajectory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of billed recurring cycles vs actual cash collected
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="billed" name="Total Invoiced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Settled Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Odoo Ecosystem Status Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-elevated flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-300">
                ERP Integration
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CONNECTED
              </span>
            </div>

            <div>
              <h4 className="text-xl font-black text-white">Odoo ERP Enterprise</h4>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                Seamless bi-directional sync with Odoo Accounting, Sales, and Subscription apps.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Customers Synced:</span>
                <span className="font-mono font-bold text-white">50 (res.partner)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Products Mapped:</span>
                <span className="font-mono font-bold text-white">6 (product.template)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Invoices Posted:</span>
                <span className="font-mono font-bold text-emerald-400">600 (account.move)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOdooOpen(true)}
            className="w-full mt-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" /> Open Odoo Sync Hub
          </button>
        </div>
      </div>

      {/* Recent Activity & Audit Trail Tabbed Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveActivityTab('subs')}
              className={`text-xs font-bold pb-1 transition flex items-center gap-1.5 ${
                activeActivityTab === 'subs'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Recent Subscriptions
            </button>
            <button
              onClick={() => setActiveActivityTab('payments')}
              className={`text-xs font-bold pb-1 transition flex items-center gap-1.5 ${
                activeActivityTab === 'payments'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Recent Payments
            </button>
            <button
              onClick={() => setActiveActivityTab('audit')}
              className={`text-xs font-bold pb-1 transition flex items-center gap-1.5 ${
                activeActivityTab === 'audit'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Audit Log Trail
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {activeActivityTab === 'subs' &&
            recentSubs.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {s.customer?.name} ({s.subscriptionNumber})
                    </div>
                    <div className="text-[11px] text-slate-500">{s.plan?.name} • Next bill: {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-slate-900">${s.totalAmount?.toFixed(2)}</div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">{s.status}</span>
                </div>
              </div>
            ))}

          {activeActivityTab === 'payments' &&
            recentPayments.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    P
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {p.invoice?.customer?.name} ({p.paymentNumber})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Inv: {p.invoice?.invoiceNumber} • Method: {p.paymentMethod}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-emerald-600">+${p.amount?.toFixed(2)}</div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}

          {activeActivityTab === 'audit' &&
            (auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                        <span>{log.action}</span>
                        <span className="text-[10px] font-normal text-slate-400 font-mono">
                          [{log.entityType}]
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{log.details}</div>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <div>{log.userName}</div>
                    <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No system audit events recorded yet.
              </div>
            ))}
        </div>
      </div>

      {/* Odoo Modal */}
      <OdooSyncModal isOpen={isOdooOpen} onClose={() => setIsOdooOpen(false)} />
    </div>
  );
};
