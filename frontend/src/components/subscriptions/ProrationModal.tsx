import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import api from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { ArrowRight, Calculator, Check, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
}

interface ProrationPreview {
  subscriptionId: string;
  subscriptionNumber: string;
  currentPlan: { id: string; name: string; price: number; billingPeriod: string };
  newPlan: { id: string; name: string; price: number; billingPeriod: string };
  cycleStartDate: string;
  cycleEndDate: string;
  totalCycleDays: number;
  daysRemaining: number;
  daysUsed: number;
  unusedOldCredit: number;
  proratedNewCharge: number;
  netAdjustment: number;
}

interface ProrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: any;
  onSuccess: () => void;
}

export const ProrationModal: React.FC<ProrationModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [preview, setPreview] = useState<ProrationPreview | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    } else {
      setPreview(null);
      setSelectedPlanId('');
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const res = await api.get('/plans');
      const allPlans = res.data || [];
      // Filter out current plan
      const available = allPlans.filter((p: Plan) => p.id !== subscription?.planId);
      setPlans(available);
      if (available.length > 0) {
        setSelectedPlanId(available[0].id);
        fetchPreview(available[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load available plans', err.response?.data?.error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchPreview = async (planId: string) => {
    if (!subscription?.id || !planId) return;
    try {
      setIsLoadingPreview(true);
      const res = await api.get(`/subscriptions/${subscription.id}/preview-proration`, {
        params: { newPlanId: planId },
      });
      setPreview(res.data);
    } catch (err: any) {
      toast.error('Could not compute proration', err.response?.data?.error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    fetchPreview(planId);
  };

  const handleExecuteChange = async () => {
    if (!subscription?.id || !selectedPlanId) return;
    try {
      setIsSubmitting(true);
      const res = await api.post(`/subscriptions/${subscription.id}/change-plan`, {
        newPlanId: selectedPlanId,
      });

      toast.success(
        'Subscription plan updated successfully!',
        res.data.adjustmentInvoiceNumber
          ? `Generated prorated invoice: ${res.data.adjustmentInvoiceNumber}`
          : res.data.adjustmentCreditNoteNumber
          ? `Issued credit note: ${res.data.adjustmentCreditNoteNumber}`
          : 'Plan switched smoothly.'
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to update plan', err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subscription) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mid-Cycle Plan Change & Proration Calculator"
      size="lg"
    >
      <div className="space-y-6 py-2">
        {/* Subscription Header */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Target Subscription</div>
            <div className="text-base font-bold text-slate-900 font-mono">
              {subscription.subscriptionNumber}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Customer: <span className="font-semibold">{subscription.customer?.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Current Tier</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {subscription.plan?.name} (${subscription.plan?.price}/mo)
            </span>
          </div>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Select New Plan
          </label>
          {isLoadingPlans ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              Loading available tiers...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePlanChange(p.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{p.name}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-extrabold text-indigo-700 mt-1">
                      ${p.price.toFixed(2)}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        / {p.billingPeriod.toLowerCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Proration Calculation Breakdown */}
        {isLoadingPreview ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-700">Calculating real-time proration...</div>
            <div className="text-xs text-slate-400 mt-1">Computing remaining cycle days & credit balances</div>
          </div>
        ) : preview ? (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-elevated">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Proration Financial Ledger
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pb-4 border-b border-indigo-900/60">
              <div className="bg-white/5 p-2.5 rounded-lg">
                <div className="text-[11px] text-slate-400">Total Cycle</div>
                <div className="text-sm font-bold text-white mt-0.5">{preview.totalCycleDays} Days</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg">
                <div className="text-[11px] text-slate-400">Days Elapsed</div>
                <div className="text-sm font-bold text-slate-300 mt-0.5">{preview.daysUsed} Days</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg border border-indigo-500/30">
                <div className="text-[11px] text-indigo-300">Days Remaining</div>
                <div className="text-sm font-extrabold text-emerald-400 mt-0.5">{preview.daysRemaining} Days</div>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg">
                <div className="text-[11px] text-slate-400">Renewal Date</div>
                <div className="text-xs font-bold text-slate-300 mt-1">
                  {new Date(preview.cycleEndDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span>Credit for unused portion ({preview.currentPlan.name}):</span>
                <span className="font-mono text-emerald-400 font-semibold">-${preview.unusedOldCredit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Prorated charge for new plan ({preview.newPlan.name}):</span>
                <span className="font-mono text-white font-semibold">+${preview.proratedNewCharge.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-indigo-800/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-base">Net Prorated Adjustment:</span>
                  <span className="text-xs text-slate-400 block">
                    {preview.netAdjustment > 0
                      ? '⚡ Customer will be invoiced for difference'
                      : preview.netAdjustment < 0
                      ? '🎟️ Customer will receive credit note adjustment'
                      : 'Zero balance change'}
                  </span>
                </div>
                <div className={`text-xl font-extrabold font-mono ${
                  preview.netAdjustment > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {preview.netAdjustment > 0 ? `+$${preview.netAdjustment.toFixed(2)}` : `-$${Math.abs(preview.netAdjustment).toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteChange}
            disabled={!preview || isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executing Adjustment...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Confirm Plan Upgrade & Bill
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

