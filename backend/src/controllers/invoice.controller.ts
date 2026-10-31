import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { runBillingCycle } from '../services/billing.service.ts';
import { generateInvoicePdf } from '../services/pdf.service.ts';
import nodemailer from 'nodemailer';

/**
 * List Invoices (Admin/Staff see all; Customer sees only own)
 */
export async function listInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const isOverdue = req.query.isOverdue === 'true';
    const customerId = req.query.customerId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};

    if (req.user?.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (isOverdue) {
      where.status = 'CONFIRMED';
      where.dueDate = { lt: new Date() };
      where.outstandingAmount = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
        { subscription: { subscriptionNumber: { contains: search } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          subscription: { select: { id: true, subscriptionNumber: true } },
          _count: { select: { payments: true } },
        },
        orderBy: { issueDate: 'desc' },
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
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
}

/**
 * Get Invoice by ID
 */
export async function getInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: {
          include: { plan: true },
        },
        lines: {
          include: { product: true, variant: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({ invoice });
  } catch (err: any) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoice.' });
  }
}

/**
 * Manual "Run Billing Now" trigger (Admin & Staff)
 */
export async function triggerManualBillingRun(req: AuthRequest, res: Response): Promise<void> {
  try {
    const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();
    const result = await runBillingCycle(targetDate);

    res.json({
      message: `Billing run executed: ${result.createdCount} invoices created, ${result.skippedCount} skipped (already billed).`,
      result,
    });
  } catch (err: any) {
    console.error('Manual billing run error:', err);
    res.status(500).json({ error: 'Failed to execute billing run.' });
  }
}

/**
 * Confirm Invoice: Flow Draft -> Confirmed (Admin & Staff)
 */
export async function confirmInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (invoice.status !== 'DRAFT') {
      res.status(400).json({ error: `Cannot confirm invoice in status '${invoice.status}'. Only DRAFT invoices can be confirmed.` });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    res.json({
      message: `Invoice ${updated.invoiceNumber} has been confirmed.`,
      invoice: updated,
    });
  } catch (err: any) {
    console.error('Confirm invoice error:', err);
    res.status(500).json({ error: 'Failed to confirm invoice.' });
  }
}

/**
 * Cancel Invoice: Flow -> Cancelled (Admin & Staff)
 */
export async function cancelInvoice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (invoice.status === 'PAID') {
      res.status(400).json({ error: 'Cannot cancel an invoice that has already been PAID in full.' });
      return;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        outstandingAmount: 0.0,
      },
    });

    res.json({
      message: `Invoice ${updated.invoiceNumber} has been cancelled.`,
      invoice: updated,
    });
  } catch (err: any) {
    console.error('Cancel invoice error:', err);
    res.status(500).json({ error: 'Failed to cancel invoice.' });
  }
}

/**
 * Send Invoice by Email (Admin & Staff)
 */
export async function sendInvoiceEmail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const info = await transporter.sendMail({
      from: '"Brightloop Billing" <billing@brightloop.io>',
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from Brightloop Software`,
      text: `Hello ${invoice.customer.name},\n\nPlease find your invoice ${invoice.invoiceNumber} for $${invoice.totalAmount.toFixed(2)}. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nThank you,\nBrightloop Software`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Invoice ${invoice.invoiceNumber}</h2>
          <p>Dear ${invoice.customer.name},</p>
          <p>Your subscription invoice for <strong>$${invoice.totalAmount.toFixed(2)}</strong> has been generated.</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p><strong>Outstanding Balance:</strong> $${invoice.outstandingAmount.toFixed(2)}</p>
          <p>Thank you for partnering with Brightloop Software.</p>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Invoice ${invoice.invoiceNumber} emailed to ${invoice.customer.email}`);
    if (previewUrl) console.log(`🔗 Ethereal Preview: ${previewUrl}`);

    res.json({
      message: `Invoice sent to ${invoice.customer.email}.`,
      previewUrl,
    });
  } catch (err: any) {
    console.error('Send invoice email error:', err);
    res.status(500).json({ error: 'Failed to dispatch invoice email.' });
  }
}

/**
 * Stream generated PDF invoice (Authenticated)
 */
export async function downloadInvoicePdf(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        subscription: true,
        lines: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && invoice.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    generateInvoicePdf(invoice, res);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate invoice PDF.' });
  }
}

