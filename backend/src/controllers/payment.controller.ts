import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { generatePaymentNumber } from '../utils/numberGenerators.ts';

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

    // Execute in Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId,
          amount: payAmount,
          paymentMethod: method,
          paymentDate: pDate,
          notes: notes ? String(notes).trim() : null,
          recordedById: req.user!.id,
        },
        include: {
          recordedBy: { select: { id: true, name: true } },
        },
      });

      // 2. Compute new totals
      const newPaid = invoice.paidAmount + payAmount;
      const newOutstanding = Math.max(0, invoice.totalAmount - newPaid);
      const isFullyPaid = newOutstanding <= 0.001;

      // 3. Update invoice status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: parseFloat(newPaid.toFixed(2)),
          outstandingAmount: parseFloat(newOutstanding.toFixed(2)),
          status: isFullyPaid ? 'PAID' : 'CONFIRMED', // Partial payment confirms the invoice
        },
        include: {
          customer: true,
          subscription: true,
        },
      });

      return { payment, updatedInvoice, isFullyPaid };
    });

    res.status(201).json({
      message: result.isFullyPaid
        ? `Payment recorded! Invoice ${result.updatedInvoice.invoiceNumber} is now PAID IN FULL.`
        : `Partial payment of $${payAmount.toFixed(2)} recorded. Outstanding balance: $${result.updatedInvoice.outstandingAmount.toFixed(2)}.`,
      payment: result.payment,
      invoice: result.updatedInvoice,
    });
  } catch (err: any) {
    console.error('Record payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
}

/**
 * List all payments with pagination & search (Admin & Staff)
 */
export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const method = req.query.method as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (method) {
      where.paymentMethod = method.toUpperCase();
    }
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { invoice: { invoiceNumber: { contains: search } } },
        { invoice: { customer: { name: { contains: search } } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              outstandingAmount: true,
              status: true,
              customer: { select: { id: true, name: true, email: true } },
            },
          },
          recordedBy: { select: { id: true, name: true } },
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
 * View Outstanding Invoices (invoices where outstandingAmount > 0 and status != CANCELLED)
 */
export async function getOutstandingInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = {
      outstandingAmount: { gt: 0 },
      status: { notIn: ['CANCELLED', 'PAID'] },
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

