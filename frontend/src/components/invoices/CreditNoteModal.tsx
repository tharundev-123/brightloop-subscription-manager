import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import api from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { FileMinus, RefreshCw } from 'lucide-react';

interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

export const CreditNoteModal: React.FC<CreditNoteModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Service dissatisfaction discount');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!invoice) return null;

  const handleIssueCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Invalid amount', 'Credit note amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/credit-notes', {
        invoiceId: invoice.id,
        amount: numAmount,
        reason,
      });

      toast.success(
        'Credit Note Issued!',
        `Ref: ${res.data.creditNoteNumber} for $${numAmount.toFixed(2)} recorded successfully.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to issue credit note', err.response?.data?.error || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Accounting Credit Note" size="md">
      <form onSubmit={handleIssueCredit} className="space-y-4 py-2">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Target Invoice:</span>
            <span className="font-bold text-slate-800">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Customer:</span>
            <span className="font-bold text-slate-800">{invoice.customer?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Total Billed:</span>
            <span className="text-slate-700">${invoice.totalAmount?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Current Outstanding:</span>
            <span className="font-bold text-rose-600">${invoice.outstandingAmount?.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Credit Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder={String(invoice.outstandingAmount || 50)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Adjustment Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="Service dissatisfaction discount">Service dissatisfaction discount</option>
            <option value="Billing error correction">Billing error correction</option>
            <option value="Mid-cycle service downgrade">Mid-cycle service downgrade</option>
            <option value="SLA breach refund / credit">SLA breach refund / credit</option>
            <option value="Goodwill gesture">Goodwill gesture</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Issuing...
              </>
            ) : (
              <>
                <FileMinus className="w-4 h-4" />
                Issue Credit Note
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

