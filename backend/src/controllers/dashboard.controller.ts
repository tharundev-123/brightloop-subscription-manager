import { Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { AuthRequest } from '../middleware/auth.middleware.ts';

/**
 * Finance Dashboard KPIs (Admin & Staff)
 * Cards: active subscriptions, revenue collected, amount outstanding, overdue invoices count
 */
export async function getDashboardKPIs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const planId = req.query.planId as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const startDateStr = req.query.startDate as string | undefined;
    const endDateStr = req.query.endDate as string | undefined;

    const subWhere: any = {};
    const invWhere: any = { status: { not: 'CANCELLED' } };

    if (planId) {
      subWhere.planId = planId;
    }
    if (customerId) {
      subWhere.customerId = customerId;
      invWhere.customerId = customerId;
    }
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      subWhere.createdAt = { gte: start, lte: end };
      invWhere.issueDate = { gte: start, lte: end };
    }

    const now = new Date();

    const [
      activeSubscriptions,
      allSubscriptionsTotal,
      invoicesAggregate,
      overdueCount,
    ] = await Promise.all([
      prisma.subscription.count({
        where: { ...subWhere, status: 'ACTIVE' },
      }),
      prisma.subscription.count({
        where: subWhere,
      }),
      prisma.invoice.aggregate({
        where: invWhere,
        _sum: {
          paidAmount: true,
          outstandingAmount: true,
          totalAmount: true,
        },
      }),
      prisma.invoice.count({
        where: {
          ...invWhere,
          status: 'CONFIRMED',
          dueDate: { lt: now },
          outstandingAmount: { gt: 0 },
        },
      }),
    ]);

    const revenueCollected = invoicesAggregate._sum.paidAmount || 0;
    const amountOutstanding = invoicesAggregate._sum.outstandingAmount || 0;
    const totalInvoiced = invoicesAggregate._sum.totalAmount || 0;

    res.json({
      kpis: {
        activeSubscriptions,
        allSubscriptionsTotal,
        revenueCollected: parseFloat(revenueCollected.toFixed(2)),
        amountOutstanding: parseFloat(amountOutstanding.toFixed(2)),
        totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
        overdueCount,
      },
    });
  } catch (err: any) {
    console.error('Dashboard KPIs error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics.' });
  }
}

/**
 * Monthly Revenue Chart Breakdown (Last 12 Months)
 */
export async function getRevenueChartData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const payments = await prisma.payment.findMany({
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const invoices = await prisma.invoice.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        totalAmount: true,
        outstandingAmount: true,
        issueDate: true,
      },
    });

    // Group by month
    const monthMap: Record<string, { month: string; revenue: number; billed: number; outstanding: number }> = {};

    // Initialize recent 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      monthMap[key] = { month: label, revenue: 0, billed: 0, outstanding: 0 };
    }

    payments.forEach((p) => {
      const d = new Date(p.paymentDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].revenue += p.amount;
      }
    });

    invoices.forEach((inv) => {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].billed += inv.totalAmount;
        monthMap[key].outstanding += inv.outstandingAmount;
      }
    });

    const chartData = Object.values(monthMap).map((m) => ({
      month: m.month,
      revenue: parseFloat(m.revenue.toFixed(2)),
      billed: parseFloat(m.billed.toFixed(2)),
      outstanding: parseFloat(m.outstanding.toFixed(2)),
    }));

    res.json({ data: chartData });
  } catch (err: any) {
    console.error('Revenue chart error:', err);
    res.status(500).json({ error: 'Failed to retrieve revenue chart data.' });
  }
}

/**
 * Recent Activity stream (Latest 6 subscriptions & latest 6 payments)
 */
export async function getRecentActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [recentSubscriptions, recentPayments] = await Promise.all([
      prisma.subscription.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          plan: { select: { name: true, billingPeriod: true } },
        },
      }),
      prisma.payment.findMany({
        take: 6,
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    res.json({
      recentSubscriptions,
      recentPayments,
    });
  } catch (err: any) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Failed to retrieve recent activity.' });
  }
}

