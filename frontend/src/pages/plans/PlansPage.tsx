import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import {
  Layers,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  minQuantity: number;
  availableFrom: string | null;
  availableTo: string | null;
  autoCloseAtEnd: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  createdAt: string;
}

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Plan Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('MONTHLY');
  const [minQuantity, setMinQuantity] = useState('1');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [autoCloseAtEnd, setAutoCloseAtEnd] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/plans');
      setPlans(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/plans', {
        name,
        price: parseFloat(price) || 0,
        billingPeriod,
        minQuantity: parseInt(minQuantity) || 1,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
        autoCloseAtEnd,
        allowEarlyClose,
        allowPause,
        allowRenewal,
      });

      setIsModalOpen(false);
      setName('');
      setPrice('');
      setBillingPeriod('MONTHLY');
      setMinQuantity('1');
      setAvailableFrom('');
      setAvailableTo('');
      setAutoCloseAtEnd(false);
      setAllowEarlyClose(true);
      setAllowPause(true);
      setAllowRenewal(true);
      fetchPlans();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" /> Subscription Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure recurring billing cadences, min quantities, and customer lifecycle governance rules
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Plan
          </button>
        ) : (
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium border border-slate-200">
            Staff View (Plans configured by Admin)
          </span>
        )}
      </div>

      {/* Plan Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading plans...</div>
      ) : error ? (
        <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-indigo-200 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {plan.billingPeriod}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-3xl font-extrabold text-slate-900">${plan.price.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-medium">/{plan.billingPeriod.toLowerCase()}</span>
                </div>

                <div className="text-xs text-slate-500 space-y-1 py-3 border-y border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>Minimum Quantity:</span>
                    <strong className="text-slate-800">{plan.minQuantity} unit(s)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Validity Window:</span>
                    <span className="text-slate-700 font-medium">
                      {plan.availableFrom ? new Date(plan.availableFrom).toLocaleDateString() : 'Always'} &rarr;{' '}
                      {plan.availableTo ? new Date(plan.availableTo).toLocaleDateString() : 'Indefinite'}
                    </span>
                  </div>
                </div>

                {/* Per-plan flags list */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Lifecycle Governance Flags
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {plan.autoCloseAtEnd ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={plan.autoCloseAtEnd ? 'text-amber-800 font-medium' : 'text-slate-500'}>
                        Auto-close at end
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allowEarlyClose ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={plan.allowEarlyClose ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                        Allow early close
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allowPause ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={plan.allowPause ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                        Allow customer pause
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.allowRenewal ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={plan.allowRenewal ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                        Allow auto-renewal
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Plan */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Subscription Plan"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Business Plus"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Base Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="99.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Billing Period *</label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available From</label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available To</label>
              <input
                type="date"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Admin Per-Plan Flags */}
          <div className="pt-3 border-t border-slate-200">
            <span className="font-semibold text-slate-800 block mb-2">Admin Governance Flags</span>
            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCloseAtEnd}
                  onChange={(e) => setAutoCloseAtEnd(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-slate-700">Auto-close subscription when expiry date is reached</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowEarlyClose}
                  onChange={(e) => setAllowEarlyClose(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-slate-700">Allow customer to request early cancellation/closure</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPause}
                  onChange={(e) => setAllowPause(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-slate-700">Allow customer to pause/resume recurring billing</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRenewal}
                  onChange={(e) => setAllowRenewal(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-slate-700">Allow automatic renewal extension</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

