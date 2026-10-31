import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';

function toCsvString(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (cell: any) => {
    const str = String(cell ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\n');
}

export async function exportSubscriptionsCsv(req: Request, res: Response) {
  try {
    const subs = await prisma.subscription.findMany({
      include: { customer: true, plan: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'Subscription Number',
      'Customer Name',
      'Customer Email',
      'Plan Name',
      'Cadence',
      'Status',
      'Dunning Status',
      'Start Date',
      'Next Billing Date',
      'Total Amount',
      'Is Paused',
    ];

    const rows = subs.map((s) => [
      s.subscriptionNumber,
      s.customer?.name || '',
      s.customer?.email || '',
      s.plan?.name || '',
      s.plan?.billingPeriod || '',
      s.status,
      s.dunningStatus || 'CURRENT',
      s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : '',
      s.nextBillingDate ? new Date(s.nextBillingDate).toISOString().slice(0, 10) : '',
      s.totalAmount,
      s.isPaused ? 'YES' : 'NO',
    ]);

    const csvData = toCsvString(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="subscriptions.csv"');
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function exportInvoicesCsv(req: Request, res: Response) {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { customer: true, subscription: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'Invoice Number',
      'Subscription Ref',
      'Customer Name',
      'Customer Email',
      'Billing Period',
      'Status',
      'Issue Date',
      'Due Date',
      'Subtotal',
      'Tax Total',
      'Discount Total',
      'Total Amount',
      'Paid Amount',
      'Outstanding Amount',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.subscription?.subscriptionNumber || '',
      inv.customer?.name || '',
      inv.customer?.email || '',
      inv.billingPeriod,
      inv.status,
      new Date(inv.issueDate).toISOString().slice(0, 10),
      new Date(inv.dueDate).toISOString().slice(0, 10),
      inv.subtotal,
      inv.taxTotal,
      inv.discountTotal,
      inv.totalAmount,
      inv.paidAmount,
      inv.outstandingAmount,
    ]);

    const csvData = toCsvString(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function exportPaymentsCsv(req: Request, res: Response) {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        invoice: { include: { customer: true } },
        recordedBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'Payment Number',
      'Invoice Number',
      'Customer Name',
      'Customer Email',
      'Amount',
      'Payment Method',
      'Payment Date',
      'Recorded By',
      'Notes',
    ];

    const rows = payments.map((p) => [
      p.paymentNumber,
      p.invoice?.invoiceNumber || '',
      p.invoice?.customer?.name || '',
      p.invoice?.customer?.email || '',
      p.amount,
      p.paymentMethod,
      new Date(p.paymentDate).toISOString().slice(0, 10),
      p.recordedBy?.name || '',
      p.notes || '',
    ]);

    const csvData = toCsvString(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

