import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { generatePaymentNumber } from '../utils/numberGenerators.ts';
import { logAudit } from '../utils/audit.ts';

/**
 * Record a payment against an invoice (Admin & Staff)
 * Supports partial payments. Automatically transitions invoice to PAID when total is covered.
 */
export async function recordPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { invoiceId, amount, paymentMethod, paymentDate, notes } = req.body;

    if (!invoiceId || amount === undefined) {
      res.status(400).json({ error: 'Invoice ID and payment amount are required.' });
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      res.status(400).json({ error: 'Payment amount must be greater than zero.' });
      return;
    }

    const validMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'];
    const method = paymentMethod && validMethods.includes(String(paymentMethod).toUpperCase())
      ? String(paymentMethod).toUpperCase()
      : 'CARD';

    // Retrieve invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (invoice.status === 'CANCELLED') {
      res.status(400).json({ error: 'Cannot record payment for a CANCELLED invoice.' });
      return;
    }

    if (invoice.status === 'PAID' || invoice.outstandingAmount <= 0) {
      res.status(400).json({ error: 'This invoice has already been paid in full.' });
      return;
    }

    // Overpayment check (with small floating tolerance)
    if (payAmount > invoice.outstandingAmount + 0.01) {
      res.status(400).json({
        error: `Payment amount ($${payAmount.toFixed(2)}) cannot exceed the outstanding balance of $${invoice.outstandingAmount.toFixed(2)}.`,
      });
      return;
    }

    const paymentNumber = await generatePaymentNumber();
    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    // Atomic transaction: create Payment & update Invoice
    const [payment, updatedInvoice] = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId,
          amount: payAmount,
          paymentMethod: method,
          paymentDate: pDate,
          notes: notes || null,
          recordedById: req.user!.id,
        },
        include: {
          invoice: {
            select: { invoiceNumber: true },
          },
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      const newPaidAmount = Number((invoice.paidAmount + payAmount).toFixed(2));
      const newOutstandingAmount = Math.max(0, Number((invoice.outstandingAmount - payAmount).toFixed(2)));
      const newStatus = newOutstandingAmount === 0 ? 'PAID' : 'CONFIRMED';

      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          status: newStatus,
        },
      });

      return [p, inv];
    });

    // Check if subscription was in dunning status, clear it if fully paid
    if (invoice.subscriptionId && updatedInvoice.outstandingAmount === 0) {
      await prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { dunningStatus: 'CURRENT', isPaused: false },
      });
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: payment.id,
      details: `Recorded payment ${paymentNumber} of $${payAmount} (${method}) for Invoice ${invoice.invoiceNumber}. New Invoice Status: ${updatedInvoice.status}`,
    });

    res.status(201).json({
      message: 'Payment recorded successfully.',
      payment,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
}

/**
 * List Payments (Admin & Staff)
 */
export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const invoiceId = req.query.invoiceId as string | undefined;
    const paymentMethod = req.query.paymentMethod as string | undefined;

    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              customer: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Failed to retrieve payments.' });
  }
}

/**
 * View Outstanding Invoices (partially paid or unpaid, confirmed)
 */
export async function getOutstandingInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = {
      status: 'CONFIRMED',
      outstandingAmount: { gt: 0 },
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, subscriptionNumber: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Get outstanding invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve outstanding invoices.' });
  }
}

/**
 * View Overdue Invoices (dueDate passed, unpaid, confirmed)
 */
export async function getOverdueInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const now = new Date();
    const where = {
      status: 'CONFIRMED',
      dueDate: { lt: now },
      outstandingAmount: { gt: 0 },
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, subscriptionNumber: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      data: invoices,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Get overdue invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve overdue invoices.' });
  }
}

/**
 * Process Instant Online Checkout (Stripe / Razorpay Flow)
 * Accessible by Customer (for their own invoice) or Staff/Admin
 */
export async function processOnlineCheckout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { invoiceId, amount, paymentMethod, cardDetails } = req.body;

    if (!invoiceId) {
      res.status(400).json({ error: 'invoiceId is required.' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, subscription: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    // Scoping check for customers
    if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied: not your invoice.' });
      return;
    }

    if (invoice.status === 'PAID' || invoice.outstandingAmount <= 0) {
      res.status(400).json({ error: 'Invoice is already paid in full.' });
      return;
    }

    const payAmount = amount ? parseFloat(amount) : invoice.outstandingAmount;
    if (isNaN(payAmount) || payAmount <= 0) {
      res.status(400).json({ error: 'Invalid payment amount.' });
      return;
    }

    // Simulate gateway authorization
    const last4 = cardDetails?.cardNumber ? String(cardDetails.cardNumber).slice(-4) : '4242';
    const gatewayTxId = `ch_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentNumber = await generatePaymentNumber();

    const newPaidAmount = Number((invoice.paidAmount + payAmount).toFixed(2));
    const newOutstanding = Math.max(0, Number((invoice.outstandingAmount - payAmount).toFixed(2)));
    const newStatus = newOutstanding === 0 ? 'PAID' : 'CONFIRMED';

    const recordedById = req.user?.id || invoice.customerId;

    const [payment, updatedInvoice] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentNumber,
          invoiceId,
          amount: payAmount,
          paymentMethod: paymentMethod || 'CARD',
          paymentDate: new Date(),
          recordedById,
          notes: `Instant Online Checkout (${paymentMethod || 'Stripe Card'} ending ${last4}) | TxID: ${gatewayTxId}`,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstanding,
          status: newStatus,
        },
      }),
    ]);

    // If subscription was in dunning status, clear it
    if (invoice.subscriptionId && newOutstanding === 0) {
      await prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          dunningStatus: 'CURRENT',
          isPaused: false,
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name || 'Customer Checkout',
      action: 'ONLINE_PAYMENT_SUCCESS',
      entityType: 'Payment',
      entityId: payment.id,
      details: `Processed online payment ${paymentNumber} of $${payAmount} via ${paymentMethod || 'Stripe Card'} for Invoice ${invoice.invoiceNumber}. New Invoice Status: ${newStatus}`,
    });

    res.json({
      success: true,
      message: 'Payment processed successfully.',
      payment,
      invoice: updatedInvoice,
      gatewayTransactionId: gatewayTxId,
    });
  } catch (err: any) {
    console.error('Online checkout error:', err);
    res.status(500).json({ error: err.message || 'Payment processing failed.' });
  }
}
