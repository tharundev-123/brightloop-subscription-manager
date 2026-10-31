import { Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

/**
 * Customer views their own subscriptions
 */
export async function getCustomerSubscriptions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const customerId = req.user!.id;

    const subscriptions = await prisma.subscription.findMany({
      where: { customerId },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: subscriptions });
  } catch (err: any) {
    console.error('Customer subscriptions error:', err);
    res.status(500).json({ error: 'Failed to retrieve your subscriptions.' });
  }
}

/**
 * Customer views their own invoices
 */
export async function getCustomerInvoices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const customerId = req.user!.id;

    const invoices = await prisma.invoice.findMany({
      where: { customerId },
      include: {
        subscription: {
          select: { subscriptionNumber: true },
        },
        lines: true,
        payments: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    res.json({ data: invoices });
  } catch (err: any) {
    console.error('Customer invoices error:', err);
    res.status(500).json({ error: 'Failed to retrieve your invoices.' });
  }
}

