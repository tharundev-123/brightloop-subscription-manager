import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

/**
 * List plans
 */
export async function listPlans(req: Request, res: Response): Promise<void> {
  try {
    const billingPeriod = req.query.billingPeriod as string | undefined;

    const where: any = {};
    if (billingPeriod) {
      where.billingPeriod = billingPeriod.toUpperCase();
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { price: 'asc' },
    });

    res.json({ data: plans });
  } catch (err: any) {
    console.error('List plans error:', err);
    res.status(500).json({ error: 'Failed to retrieve plans.' });
  }
}

/**
 * Get plan by ID
 */
export async function getPlan(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    res.json({ plan });
  } catch (err: any) {
    console.error('Get plan error:', err);
    res.status(500).json({ error: 'Failed to retrieve plan.' });
  }
}

/**
 * Create plan (Admin only)
 */
export async function createPlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      name,
      price,
      billingPeriod,
      minQuantity,
      availableFrom,
      availableTo,
      autoCloseAtEnd,
      allowEarlyClose,
      allowPause,
      allowRenewal,
    } = req.body;

    if (!name || price === undefined) {
      res.status(400).json({ error: 'Plan name and price are required.' });
      return;
    }

    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
    const period = billingPeriod && validPeriods.includes(billingPeriod.toUpperCase())
      ? billingPeriod.toUpperCase()
      : 'MONTHLY';

    const plan = await prisma.plan.create({
      data: {
        name: String(name).trim(),
        price: parseFloat(price) || 0,
        billingPeriod: period,
        minQuantity: parseInt(minQuantity) || 1,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        autoCloseAtEnd: Boolean(autoCloseAtEnd),
        allowEarlyClose: allowEarlyClose !== undefined ? Boolean(allowEarlyClose) : true,
        allowPause: allowPause !== undefined ? Boolean(allowPause) : true,
        allowRenewal: allowRenewal !== undefined ? Boolean(allowRenewal) : true,
      },
    });

    res.status(201).json({
      message: 'Plan created successfully.',
      plan,
    });
  } catch (err: any) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
}

/**
 * Update plan (Admin only)
 */
export async function updatePlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      billingPeriod,
      minQuantity,
      availableFrom,
      availableTo,
      autoCloseAtEnd,
      allowEarlyClose,
      allowPause,
      allowRenewal,
    } = req.body;

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(billingPeriod && { billingPeriod: String(billingPeriod).toUpperCase() }),
        ...(minQuantity !== undefined && { minQuantity: parseInt(minQuantity) }),
        ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom) : null }),
        ...(availableTo !== undefined && { availableTo: availableTo ? new Date(availableTo) : null }),
        ...(autoCloseAtEnd !== undefined && { autoCloseAtEnd: Boolean(autoCloseAtEnd) }),
        ...(allowEarlyClose !== undefined && { allowEarlyClose: Boolean(allowEarlyClose) }),
        ...(allowPause !== undefined && { allowPause: Boolean(allowPause) }),
        ...(allowRenewal !== undefined && { allowRenewal: Boolean(allowRenewal) }),
      },
    });

    res.json({
      message: 'Plan updated successfully.',
      plan: updated,
    });
  } catch (err: any) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Failed to update plan.' });
  }
}

/**
 * Delete plan (Admin only)
 */
export async function deletePlan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const subCount = await prisma.subscription.count({ where: { planId: id } });
    if (subCount > 0) {
      res.status(400).json({
        error: `Cannot delete plan: it is used by ${subCount} subscription(s).`,
      });
      return;
    }

    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'Plan deleted successfully.' });
  } catch (err: any) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
}

