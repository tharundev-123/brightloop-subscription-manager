import React, { useState } from 'react';
import { Modal } from '../ui/Modal.tsx';
import api from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { CreditCard, Lock, CheckCircle2, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI'>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  if (!invoice) return null;

  const handleFillDemoCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const res = await api.post('/payments/checkout', {
        invoiceId: invoice.id,
        amount: invoice.outstandingAmount,
        paymentMethod: paymentMethod === 'CARD' ? 'CARD' : 'UPI',
        cardDetails: {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expiry,
          cvc,
        },
      });

      setPaymentSuccess(res.data);
      toast.success(
        'Payment successful!',
        `TxID: ${res.data.gatewayTransactionId} — Invoice ${invoice.invoiceNumber} is marked PAID.`
      );
      onSuccess();
    } catch (err: any) {
      toast.error('Payment failed', err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDone = () => {
    setPaymentSuccess(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={paymentSuccess ? handleDone : onClose}
      title="Secure Online Checkout"
      size="md"
    >
      {paymentSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Payment Confirmed!</h3>
            <p className="text-sm text-slate-500 mt-1">
              Your payment has been authorized and reconciled.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Number:</span>
              <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-bold text-emerald-600">${invoice.outstandingAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Ref:</span>
              <span className="font-bold text-slate-900">{paymentSuccess.payment?.paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway TxID:</span>
              <span className="font-bold text-indigo-600">{paymentSuccess.gatewayTransactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600">PAID (SETTLED)</span>
            </div>
          </div>

          <button
            onClick={handleDone}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
          >
            Close Receipt
          </button>
        </div>
      ) : (
        <form onSubmit={handleProcessPayment} className="space-y-5 py-2">
          {/* Order Summary Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Billed To</div>
              <div className="text-sm font-bold text-slate-900">{invoice.customer?.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Inv: {invoice.invoiceNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Total Due</div>
              <div className="text-2xl font-extrabold text-indigo-600 font-mono">
                ${invoice.outstandingAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                paymentMethod === 'CARD'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Card (Stripe)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                paymentMethod === 'UPI'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Instant UPI
            </button>
          </div>

          {paymentMethod === 'CARD' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Card Details
                </label>
                <button
                  type="button"
                  onClick={handleFillDemoCard}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  ⚡ Auto-fill Test Card
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono tracking-wider"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-center"
                  required
                />
                <input
                  type="text"
                  placeholder="CVC (123)"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-center"
                  maxLength={4}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Virtual Payment Address (UPI ID)
              </label>
              <input
                type="text"
                placeholder="acme@okaxis or business@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                required
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>256-bit SSL encrypted. Simulated Stripe payment gateway authorizer.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authorizing Payment...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Pay ${invoice.outstandingAmount.toFixed(2)} Now
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

