import prisma from '../utils/prisma.ts';
import { logAudit } from '../utils/audit.ts';
import { sendEmail } from './email.service.ts';

export interface DunningRunReport {
  timestamp: string;
  overdueInvoicesFound: number;
  remindersSent: number;
  subscriptionsPastDue: number;
  subscriptionsSuspended: number;
}

export class DunningService {
  /**
   * Run dunning scan across all subscriptions with overdue invoices
   */
  async runDunningScan(userId?: string, userName?: string): Promise<DunningRunReport> {
    const now = new Date();

    // Find all unpaid invoices whose dueDate is past
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['CONFIRMED', 'DRAFT'] },
        dueDate: { lt: now },
        outstandingAmount: { gt: 0 },
      },
      include: {
        subscription: true,
        customer: true,
      },
    });

    let remindersSent = 0;
    let subscriptionsPastDue = 0;
    let subscriptionsSuspended = 0;

    for (const inv of overdueInvoices) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const sub = inv.subscription;

      if (!sub) continue;

      if (daysOverdue >= 14 && sub.dunningStatus !== 'SUSPENDED') {
        // Suspend subscription
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            dunningStatus: 'SUSPENDED',
            isPaused: true,
          },
        });
        subscriptionsSuspended++;

        await logAudit({
          userId,
          userName: userName || 'Dunning Engine',
          action: 'DUNNING_SUSPENDED',
          entityType: 'Subscription',
          entityId: sub.id,
          details: `Subscription auto-suspended: Invoice ${inv.invoiceNumber} is ${daysOverdue} days overdue ($${inv.outstandingAmount} outstanding).`,
        });
      } else if (daysOverdue >= 7 && sub.dunningStatus !== 'PAST_DUE' && sub.dunningStatus !== 'SUSPENDED') {
        // Mark as Past Due
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { dunningStatus: 'PAST_DUE' },
        });
        subscriptionsPastDue++;

        await logAudit({
          userId,
          userName: userName || 'Dunning Engine',
          action: 'DUNNING_PAST_DUE',
          entityType: 'Subscription',
          entityId: sub.id,
          details: `Subscription marked PAST_DUE: Invoice ${inv.invoiceNumber} is ${daysOverdue} days overdue.`,
        });
      } else if (daysOverdue >= 1 && sub.dunningStatus === 'CURRENT') {
        // Mark as Reminder Sent
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { dunningStatus: 'REMINDER_SENT' },
        });
        remindersSent++;
      }
    }

    return {
      timestamp: now.toISOString(),
      overdueInvoicesFound: overdueInvoices.length,
      remindersSent,
      subscriptionsPastDue,
      subscriptionsSuspended,
    };
  }

  /**
   * Send specific dunning reminder email for an overdue invoice
   */
  async sendReminderEmail(invoiceId: string, userId?: string, userName?: string) {
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, subscription: true },
    });

    if (!inv) throw new Error('Invoice not found');

    const payUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/portal?payInvoice=${inv.id}`;

    const emailResult = await sendEmail({
      to: inv.customer.email,
      subject: `⚠️ Payment Reminder: Invoice ${inv.invoiceNumber} is Overdue`,
      text: `Dear ${inv.customer.name},\n\nYour invoice ${inv.invoiceNumber} for $${inv.outstandingAmount.toFixed(2)} was due on ${new Date(inv.dueDate).toLocaleDateString()}.\n\nPlease remit payment promptly using the following link:\n${payUrl}\n\nThank you,\nBrightloop Accounts Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #e11d48; margin-top: 0;">Payment Overdue Notice</h2>
          <p>Dear <strong>${inv.customer.name}</strong>,</p>
          <p>Your subscription invoice <strong>${inv.invoiceNumber}</strong> is currently overdue.</p>
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Invoice Number:</strong> ${inv.invoiceNumber}</p>
            <p style="margin: 0 0 8px 0;"><strong>Due Date:</strong> ${new Date(inv.dueDate).toLocaleDateString()}</p>
            <p style="margin: 0; font-size: 18px; color: #be123c;"><strong>Outstanding Balance:</strong> $${inv.outstandingAmount.toFixed(2)}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Now Online</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">If you have already paid this invoice, please disregard this notice.</p>
        </div>
      `,
    });

    // Update subscription dunning state
    if (inv.subscription) {
      await prisma.subscription.update({
        where: { id: inv.subscription.id },
        data: { dunningStatus: 'REMINDER_SENT' },
      });
    }

    await logAudit({
      userId,
      userName: userName || 'Accounts Team',
      action: 'DUNNING_REMINDER_SENT',
      entityType: 'Invoice',
      entityId: inv.id,
      details: `Dispatched overdue reminder email to ${inv.customer.email} for $${inv.outstandingAmount}.`,
    });

    return {
      success: true,
      emailResult,
      invoiceNumber: inv.invoiceNumber,
      customerEmail: inv.customer.email,
    };
  }
}

export const dunningService = new DunningService();

