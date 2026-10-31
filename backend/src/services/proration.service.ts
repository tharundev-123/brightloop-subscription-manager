import prisma from '../utils/prisma.ts';
import { generateInvoiceNumber, generateCreditNoteNumber } from '../utils/numberGenerators.ts';
import { logAudit } from '../utils/audit.ts';

export interface ProrationPreviewResult {
  subscriptionId: string;
  subscriptionNumber: string;
  currentPlan: { id: string; name: string; price: number; billingPeriod: string };
  newPlan: { id: string; name: string; price: number; billingPeriod: string };
  cycleStartDate: string;
  cycleEndDate: string;
  totalCycleDays: number;
  daysRemaining: number;
  daysUsed: number;
  unusedOldCredit: number;
  proratedNewCharge: number;
  netAdjustment: number; // positive = customer owes money; negative = customer gets credit
}

export class ProrationService {
  /**
   * Preview mid-cycle plan upgrade/downgrade calculation
   */
  async previewPlanChange(subscriptionId: string, newPlanId: string): Promise<ProrationPreviewResult> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error(`Subscription with ID ${subscriptionId} not found.`);
    }

    const newPlan = await prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new Error(`Plan with ID ${newPlanId} not found.`);
    }

    const now = new Date();
    const cycleEndDate = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : new Date(now.getTime() + 30 * 86400000);
    
    // Estimate cycle start date from cadence
    const cycleStartDate = new Date(cycleEndDate);
    if (subscription.plan.billingPeriod === 'YEARLY') {
      cycleStartDate.setFullYear(cycleStartDate.getFullYear() - 1);
    } else if (subscription.plan.billingPeriod === 'WEEKLY') {
      cycleStartDate.setDate(cycleStartDate.getDate() - 7);
    } else {
      // Monthly default
      cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
    }

    const totalMs = Math.max(1, cycleEndDate.getTime() - cycleStartDate.getTime());
    const remainingMs = Math.max(0, cycleEndDate.getTime() - now.getTime());
    const totalCycleDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.min(totalCycleDays, Math.round(remainingMs / (1000 * 60 * 60 * 24))));
    const daysUsed = Math.max(0, totalCycleDays - daysRemaining);

    const oldDailyRate = subscription.plan.price / totalCycleDays;
    const newDailyRate = newPlan.price / totalCycleDays;

    const unusedOldCredit = Number((oldDailyRate * daysRemaining).toFixed(2));
    const proratedNewCharge = Number((newDailyRate * daysRemaining).toFixed(2));
    const netAdjustment = Number((proratedNewCharge - unusedOldCredit).toFixed(2));

    return {
      subscriptionId,
      subscriptionNumber: subscription.subscriptionNumber,
      currentPlan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price,
        billingPeriod: subscription.plan.billingPeriod,
      },
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPlan.price,
        billingPeriod: newPlan.billingPeriod,
      },
      cycleStartDate: cycleStartDate.toISOString(),
      cycleEndDate: cycleEndDate.toISOString(),
      totalCycleDays,
      daysRemaining,
      daysUsed,
      unusedOldCredit,
      proratedNewCharge,
      netAdjustment,
    };
  }

  /**
   * Execute the mid-cycle plan upgrade/downgrade
   */
  async executePlanChange(
    subscriptionId: string,
    newPlanId: string,
    userId?: string,
    userName?: string
  ) {
    const preview = await this.previewPlanChange(subscriptionId, newPlanId);
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { customer: true, lines: true },
    });

    if (!sub) throw new Error('Subscription not found');

    let adjustmentInvoiceNumber: string | null = null;
    let adjustmentCreditNoteNumber: string | null = null;

    // If net adjustment is positive (customer owes prorated difference), issue prorated invoice
    if (preview.netAdjustment > 0) {
      const invNumber = await generateInvoiceNumber();
      const product = await prisma.product.findFirst();
      const taxRate = 18.0;
      const taxAmount = Number(((preview.netAdjustment * taxRate) / 100).toFixed(2));
      const totalAmount = Number((preview.netAdjustment + taxAmount).toFixed(2));

      const inv = await prisma.invoice.create({
        data: {
          invoiceNumber: invNumber,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          billingPeriod: `PRORATED-${new Date().toISOString().slice(0, 10)}`,
          status: 'CONFIRMED',
          issueDate: new Date(),
          dueDate: new Date(),
          subtotal: preview.netAdjustment,
          taxTotal: taxAmount,
          discountTotal: 0,
          totalAmount,
          paidAmount: 0,
          outstandingAmount: totalAmount,
          notes: `Prorated adjustment: Upgrade to ${preview.newPlan.name} for ${preview.daysRemaining} days remaining in cycle.`,
          lines: {
            create: [
              {
                productId: product?.id || 'default',
                description: `Prorated Plan Upgrade (${preview.currentPlan.name} -> ${preview.newPlan.name}) for ${preview.daysRemaining} days`,
                quantity: 1,
                unitPrice: preview.netAdjustment,
                taxRate,
                taxAmount,
                discountAmount: 0,
                lineTotal: totalAmount,
              },
            ],
          },
        },
      });
      adjustmentInvoiceNumber = inv.invoiceNumber;
    } else if (preview.netAdjustment < 0) {
      // Customer downgraded or gets credit
      const cnNumber = await generateCreditNoteNumber();
      const creditAmt = Math.abs(preview.netAdjustment);
      const lastInvoice = await prisma.invoice.findFirst({
        where: { subscriptionId: sub.id },
        orderBy: { createdAt: 'desc' },
      });

      if (lastInvoice) {
        const cn = await prisma.creditNote.create({
          data: {
            creditNoteNumber: cnNumber,
            invoiceId: lastInvoice.id,
            customerId: sub.customerId,
            amount: creditAmt,
            reason: `Prorated downgrade credit (${preview.currentPlan.name} -> ${preview.newPlan.name})`,
            status: 'ISSUED',
          },
        });
        adjustmentCreditNoteNumber = cn.creditNoteNumber;
      }
    }

    // Update Subscription Plan
    const updatedSub = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
      },
      include: { plan: true, lines: true, customer: true },
    });

    await logAudit({
      userId,
      userName,
      action: 'PLAN_CHANGE_PRORATED',
      entityType: 'Subscription',
      entityId: subscriptionId,
      details: `Plan changed from ${preview.currentPlan.name} to ${preview.newPlan.name}. Net adjustment: $${preview.netAdjustment}. ${
        adjustmentInvoiceNumber ? `Invoice: ${adjustmentInvoiceNumber}` : ''
      } ${adjustmentCreditNoteNumber ? `Credit Note: ${adjustmentCreditNoteNumber}` : ''}`,
    });

    return {
      subscription: updatedSub,
      preview,
      adjustmentInvoiceNumber,
      adjustmentCreditNoteNumber,
    };
  }
}

export const prorationService = new ProrationService();

