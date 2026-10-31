import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import {
  Percent,
  Tag,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react';

interface TaxRule {
  id: string;
  name: string;
  percentage: number;
  appliesTo: string;
  isActive: boolean;
}

interface Discount {
  id: string;
  code: string;
  type: string;
  value: number;
  minPurchaseAmount: number;
  minQuantity: number;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number;
  usageCount: number;
  appliesTo: string;
  productId: string | null;
  isActive: boolean;
  product?: { id: string; name: string };
}

export const TaxesDiscountsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'taxes' | 'discounts'>('taxes');
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Tax Modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('');
  const [taxAppliesTo, setTaxAppliesTo] = useState('ALL');

  // New Discount Modal
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('0');
  const [minQty, setMinQty] = useState('0');
  const [usageLimit, setUsageLimit] = useState('100');
  const [discountAppliesTo, setDiscountAppliesTo] = useState('SUBSCRIPTION');

  // Interactive Test Discount Widget
  const [testCode, setTestCode] = useState('WELCOME10');
  const [testAmount, setTestAmount] = useState('200');
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [taxRes, discRes] = await Promise.all([
        api.get('/taxes'),
        api.get('/discounts'),
      ]);
      setTaxes(taxRes.data.data);
      setDiscounts(discRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/taxes', {
        name: taxName,
        percentage: parseFloat(taxPercentage) || 0,
        appliesTo: taxAppliesTo,
      });
      setIsTaxModalOpen(false);
      setTaxName('');
      setTaxPercentage('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create tax rule');
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/discounts', {
        code: discountCode,
        type: discountType,
        value: parseFloat(discountValue) || 0,
        minPurchaseAmount: parseFloat(minPurchase) || 0,
        minQuantity: parseInt(minQty) || 0,
        usageLimit: parseInt(usageLimit) || 100,
        appliesTo: discountAppliesTo,
      });
      setIsDiscountModalOpen(false);
      setDiscountCode('');
      setDiscountValue('');
      setMinPurchase('0');
      setMinQty('0');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create discount');
    }
  };

  const handleTestDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    setTestError(null);
    try {
      const res = await api.post('/discounts/validate', {
        code: testCode,
        amount: parseFloat(testAmount) || 0,
        quantity: 1,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestError(err.response?.data?.error || 'Discount validation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" /> Taxes & Discounts Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated tax calculations for invoices and promotional discounts with usage limits
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {activeTab === 'taxes' ? (
              <button
                onClick={() => setIsTaxModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Tax Rule
              </button>
            ) : (
              <button
                onClick={() => setIsDiscountModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Add Discount Code
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('taxes')}
          className={`pb-3 px-1 border-b-2 transition ${
            activeTab === 'taxes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tax Rules ({taxes.length})
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`pb-3 px-1 border-b-2 transition ${
            activeTab === 'discounts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Discounts & Promos ({discounts.length})
        </button>
      </div>

      {/* TAB 1: TAX RULES */}
      {activeTab === 'taxes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tax Name</th>
                  <th className="py-3 px-4">Percentage Rate</th>
                  <th className="py-3 px-4">Applies To</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{tax.name}</td>
                    <td className="py-3 px-4 font-bold text-indigo-600 text-sm">{tax.percentage}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tax.appliesTo === 'ALL' ? 'All Invoice Lines' : 'Specific Products'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tax.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DISCOUNTS */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {/* Interactive Discount Validator Widget */}
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Test Discount Calculator
            </div>
            <form onSubmit={handleTestDiscount} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Promo Code (e.g. WELCOME10)"
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg uppercase font-mono font-semibold text-slate-800 focus:outline-none"
              />
              <input
                type="number"
                step="0.01"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="Cart Total ($ e.g. 200)"
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
              >
                Validate & Calculate Savings
              </button>
            </form>

            {testResult && (
              <div className="mt-3 p-3 bg-white border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Valid code! Discount: <strong>-${testResult.discountAmount.toFixed(2)}</strong> ({testResult.value}
                    {testResult.type === 'PERCENTAGE' ? '%' : '$'})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Remaining uses: <strong>{testResult.remainingUses}</strong>
                </span>
              </div>
            )}

            {testError && (
              <div className="mt-3 p-3 bg-white border border-rose-300 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{testError}</span>
              </div>
            )}
          </div>

          {/* Discounts Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Value / Type</th>
                    <th className="py-3 px-4">Minimum Requirement</th>
                    <th className="py-3 px-4">Usage Counter</th>
                    <th className="py-3 px-4">Applies To</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((disc) => {
                    const isLimitReached = disc.usageCount >= disc.usageLimit;
                    return (
                      <tr key={disc.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {disc.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-700">
                          {disc.type === 'PERCENTAGE' ? `${disc.value}% OFF` : `$${disc.value.toFixed(2)} FLAT`}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {disc.minPurchaseAmount > 0 ? (
                            <span>Min spend: ${disc.minPurchaseAmount.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {disc.usageCount} / {disc.usageLimit}
                            </span>
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isLimitReached ? 'bg-rose-500' : 'bg-indigo-600'
                                }`}
                                style={{
                                  width: `${Math.min(100, (disc.usageCount / disc.usageLimit) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {disc.appliesTo}
                        </td>
                        <td className="py-3 px-4">
                          {isLimitReached ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                              Limit Reached
                            </span>
                          ) : disc.isActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                              Disabled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Tax */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        title="Add Tax Rule"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTax} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tax Rule Name *</label>
            <input
              type="text"
              required
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              placeholder="e.g. State VAT 12%"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Percentage Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(e.target.value)}
              placeholder="12.0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Applies To</label>
            <select
              value={taxAppliesTo}
              onChange={(e) => setTaxAppliesTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Items & Invoices</option>
              <option value="PRODUCT">Specific Products Only</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTaxModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Discount */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Add Promotional Discount"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Code *</label>
              <input
                type="text"
                required
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="e.g. FLASH30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Value *</label>
              <input
                type="number"
                step="0.01"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="15.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Spend ($)</label>
              <input
                type="number"
                step="0.01"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Usage Limit</label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDiscountModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save Discount
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

