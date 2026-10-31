import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
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
  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSubs, setRecentSubs] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, chartRes, actRes, planRes] = await Promise.all([
        api.get('/dashboard/kpis', { params: { planId: selectedPlan || undefined } }),
        api.get('/dashboard/revenue-chart'),
        api.get('/dashboard/recent-activity'),
        api.get('/plans'),
      ]);

      setKpis(kpiRes.data.kpis);
      setChartData(chartRes.data.data);
      setRecentSubs(actRes.data.recentSubscriptions);
      setRecentPayments(actRes.data.recentPayments);
      setPlans(planRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPlan]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Filter Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Finance & Revenue Dashboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              Live Metrics
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time financial performance, recurring subscription metrics, and receivables reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Plans (Consolidated)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Active Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {kpis?.activeSubscriptions ?? '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              of {kpis?.allSubscriptionsTotal ?? '—'} total
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> High-volume active recurring accounts
          </div>
        </div>

        {/* Card 2: Revenue Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Revenue Collected
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">
              ${kpis?.revenueCollected?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            Cash, Card, UPI & Bank settlements
          </div>
        </div>

        {/* Card 3: Amount Outstanding */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Amount Outstanding
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              ${kpis?.amountOutstanding?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            Pending collections on confirmed invoices
          </div>
        </div>

        {/* Card 4: Overdue Invoices Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-rose-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Accounts
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">
              {kpis?.overdueCount ?? '0'}
            </span>
            <span className="text-xs text-rose-600 font-medium">Invoices</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 font-medium">
            Due dates passed requiring follow-up
          </div>
        </div>
      </div>

      {/* Revenue Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monthly Revenue vs Outstanding</h3>
            <p className="text-xs text-slate-500">Collections and billed volumes over the last 6 months</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="revenue" name="Collected Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Pending Balance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Subscriptions & Payments Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Recent Subscriptions</span>
            <span className="text-xs font-normal text-indigo-600 font-semibold">Latest 6</span>
          </h3>

          <div className="space-y-3">
            {recentSubs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-indigo-600 block">
                    {sub.subscriptionNumber}
                  </span>
                  <span className="font-semibold text-slate-900">{sub.customer?.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">${sub.totalAmount.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    {sub.plan?.billingPeriod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Recent Settlements</span>
            <span className="text-xs font-normal text-emerald-600 font-semibold">Latest 6</span>
          </h3>

          <div className="space-y-3">
            {recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-emerald-700 block">
                    {p.paymentNumber}
                  </span>
                  <span className="text-slate-600">
                    {p.invoice?.customer?.name} ({p.invoice?.invoiceNumber})
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 text-sm block">
                    +${p.amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

