import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { generateSubscriptionNumber } from '../utils/numberGenerators.ts';

// Valid transitions dictionary
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['QUOTATION', 'CLOSED'],
  QUOTATION: ['CONFIRMED', 'CLOSED'],
  CONFIRMED: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['CLOSED'],
  CLOSED: [], // terminal state
};

/**
 * Calculate the next billing date given a start date and billing period
 */
export function calculateNextBillingDate(startDate: Date, billingPeriod: string): Date {
  const d = new Date(startDate);
  switch (billingPeriod.toUpperCase()) {
    case 'DAILY':
      d.setDate(d.getDate() + 1);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

/**
 * List Subscriptions (Admin & Staff: all; Customer: only their own)
 */
export async function listSubscriptions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const planId = req.query.planId as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};

    // Customer scoping
    if (req.user?.role === 'CUSTOMER') {
      where.customerId = req.user.id;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status.toUpperCase();
    }
    if (planId) {
      where.planId = planId;
    }
    if (search) {
      where.OR = [
        { subscriptionNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, price: true, billingPeriod: true, allowPause: true, allowRenewal: true, allowEarlyClose: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, type: true } },
              variant: true,
            },
          },
          _count: { select: { invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      data: subscriptions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('List subscriptions error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
  }
}

/**
 * Get Subscription by ID
 */
export async function getSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: true,
        template: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        invoices: {
          orderBy: { issueDate: 'desc' },
          include: {
            payments: true,
          },
        },
      },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    // Role check: Customer can only view their own subscription
    if (req.user?.role === 'CUSTOMER' && subscription.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    res.json({ subscription });
  } catch (err: any) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to retrieve subscription.' });
  }
}

/**
 * Create Subscription from scratch
 */
export async function createSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      customerId,
      planId,
      templateId,
      startDate,
      paymentTerms,
      notes,
      lines,
    } = req.body;

    if (!customerId || !planId) {
      res.status(400).json({ error: 'Customer and plan are required.' });
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      res.status(404).json({ error: 'Selected plan not found.' });
      return;
    }

    const subNumber = await generateSubscriptionNumber();
    const start = startDate ? new Date(startDate) : new Date();
    const nextBilling = calculateNextBillingDate(start, plan.billingPeriod);

    // Calculate lines total
    let totalLinesAmount = 0;
    const processedLines = (lines || []).map((line: any) => {
      const qty = parseInt(line.quantity) || 1;
      const unit = parseFloat(line.unitPrice) || 0;
      const taxRate = parseFloat(line.taxRate) || 0.18;
      const discount = parseFloat(line.discountAmount) || 0;
      const subtotal = qty * unit - discount;
      const tax = subtotal * taxRate;
      const lineTotal = subtotal + tax;
      totalLinesAmount += lineTotal;

      return {
        productId: line.productId,
        variantId: line.variantId || null,
        quantity: qty,
        unitPrice: unit,
        discountAmount: discount,
        taxAmount: tax,
        totalAmount: lineTotal,
      };
    });

    const finalTotal = plan.price + totalLinesAmount;

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId,
        planId,
        templateId: templateId || null,
        status: 'DRAFT',
        startDate: start,
        nextBillingDate: nextBilling,
        paymentTerms: paymentTerms || 'IMMEDIATE',
        totalAmount: finalTotal,
        notes,
        lines: {
          create: processedLines,
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true, variant: true } },
      },
    });

    res.status(201).json({
      message: 'Subscription created successfully.',
      subscription,
    });
  } catch (err: any) {
    console.error('Create subscription error:', err);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
}

/**
 * 1-CLICK: Create a subscription directly from a Quotation Template!
 */
export async function createFromTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { templateId, customerId, paymentTerms } = req.body;

    if (!templateId || !customerId) {
      res.status(400).json({ error: 'Template ID and Customer ID are required.' });
      return;
    }

    const template = await prisma.quotationTemplate.findUnique({
      where: { id: templateId },
      include: {
        plan: true,
        lines: { include: { product: true } },
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Quotation template not found.' });
      return;
    }

    const subNumber = await generateSubscriptionNumber();
    const start = new Date();
    const expiry = new Date(start.getTime() + template.validDays * 24 * 60 * 60 * 1000);
    const nextBilling = calculateNextBillingDate(start, template.plan.billingPeriod);

    let totalLinesAmount = 0;
    const linesData = template.lines.map((l) => {
      const lineSubtotal = l.quantity * l.unitPrice;
      const tax = lineSubtotal * 0.18; // default 18% GST
      const lineTotal = lineSubtotal + tax;
      totalLinesAmount += lineTotal;

      return {
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxAmount: tax,
        discountAmount: 0,
        totalAmount: lineTotal,
      };
    });

    const totalAmount = template.plan.price + totalLinesAmount;

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId,
        planId: template.planId,
        templateId: template.id,
        status: 'QUOTATION', // Templates instantiate directly as formal Quotations ready to send
        startDate: start,
        expiryDate: expiry,
        nextBillingDate: nextBilling,
        paymentTerms: paymentTerms || 'IMMEDIATE',
        totalAmount,
        notes: `Instantiated from template: ${template.name}`,
        lines: {
          create: linesData,
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: { include: { product: true } },
      },
    });

    res.status(201).json({
      message: `Subscription created in 1-click from template '${template.name}'.`,
      subscription,
    });
  } catch (err: any) {
    console.error('Create from template error:', err);
    res.status(500).json({ error: 'Failed to create subscription from template.' });
  }
}

/**
 * Strict Status Transition Flow: Draft -> Quotation -> Confirmed -> Active -> Closed
 */
export async function updateSubscriptionStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;

    if (!targetStatus) {
      res.status(400).json({ error: 'targetStatus is required.' });
      return;
    }

    const nextStatus = String(targetStatus).toUpperCase();

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    const currentStatus = subscription.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(nextStatus)) {
      res.status(400).json({
        error: `Invalid status transition: Cannot transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: [${allowed.join(', ') || 'None'}].`,
      });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: nextStatus,
        // If activated, ensure nextBillingDate is set
        ...(nextStatus === 'ACTIVE' && !subscription.nextBillingDate && {
          nextBillingDate: calculateNextBillingDate(new Date(), subscription.plan.billingPeriod),
        }),
      },
      include: { customer: true, plan: true, lines: true },
    });

    res.json({
      message: `Subscription status transitioned to ${nextStatus}.`,
      subscription: updated,
    });
  } catch (err: any) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update subscription status.' });
  }
}

/**
 * Pause / Resume Subscription (Governed by Plan.allowPause)
 */
export async function togglePauseSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    // Role check
    if (req.user?.role === 'CUSTOMER' && subscription.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    // Plan check
    if (!subscription.plan.allowPause) {
      res.status(400).json({
        error: `Pausing is not permitted by the '${subscription.plan.name}' plan policy.`,
      });
      return;
    }

    if (subscription.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Only ACTIVE subscriptions can be paused or resumed.' });
      return;
    }

    const newPausedState = !subscription.isPaused;
    const updated = await prisma.subscription.update({
      where: { id },
      data: { isPaused: newPausedState },
    });

    res.json({
      message: newPausedState ? 'Subscription paused.' : 'Subscription resumed.',
      subscription: updated,
    });
  } catch (err: any) {
    console.error('Pause error:', err);
    res.status(500).json({ error: 'Failed to toggle pause state.' });
  }
}

/**
 * Renew Subscription (Governed by Plan.allowRenewal)
 */
export async function renewSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && subscription.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (!subscription.plan.allowRenewal) {
      res.status(400).json({
        error: `Renewal is not permitted by the '${subscription.plan.name}' plan policy.`,
      });
      return;
    }

    const currentExpiry = subscription.expiryDate || new Date();
    // Extend expiry by 1 full period or 1 year
    const newExpiry = new Date(currentExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        expiryDate: newExpiry,
        status: 'ACTIVE',
      },
    });

    res.json({
      message: `Subscription successfully renewed until ${newExpiry.toLocaleDateString()}.`,
      subscription: updated,
    });
  } catch (err: any) {
    console.error('Renew error:', err);
    res.status(500).json({ error: 'Failed to renew subscription.' });
  }
}

/**
 * Early Close Subscription (Governed by Plan.allowEarlyClose)
 */
export async function closeSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && subscription.customerId !== req.user.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (!subscription.plan.allowEarlyClose && req.user?.role === 'CUSTOMER') {
      res.status(400).json({
        error: `Early cancellation is not allowed by the '${subscription.plan.name}' plan policy.`,
      });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: 'CLOSED',
        nextBillingDate: null,
      },
    });

    res.json({
      message: 'Subscription has been closed.',
      subscription: updated,
    });
  } catch (err: any) {
    console.error('Close error:', err);
    res.status(500).json({ error: 'Failed to close subscription.' });
  }
}

