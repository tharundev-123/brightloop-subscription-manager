import prisma from '../utils/prisma.ts';
import { generateInvoiceNumber } from '../utils/numberGenerators.ts';
import { calculateNextBillingDate } from '../controllers/subscription.controller.ts';

export interface BillingRunResult {
  runDate: string;
  processedCount: number;
  createdCount: number;
  skippedCount: number;
  invoicesCreated: string[];
}

/**
 * Format the billing period key according to subscription plan cadence
 * (e.g. Monthly: '2026-10', Daily: '2026-10-31', Weekly: '2026-W44', Yearly: '2026')
 */
export function formatBillingPeriod(date: Date, periodCadence: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (periodCadence.toUpperCase()) {
    case 'DAILY':
      return `${year}-${month}-${day}`;
    case 'WEEKLY': {
      // Calculate week number
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${year}-W${String(weekNo).padStart(2, '0')}`;
    }
    case 'YEARLY':
      return `${year}`;
    case 'MONTHLY':
    default:
      return `${year}-${month}`;
  }
}

/**
 * Core Idempotent Billing Engine
 * Can be triggered automatically by cron or manually via API.
 */
export async function runBillingCycle(targetDate: Date = new Date()): Promise<BillingRunResult> {
  console.log(`⚡ [BillingEngine] Commencing billing run for cutoff date: ${targetDate.toISOString()}`);

  // 1. Fetch eligible subscriptions:
  // - status == 'ACTIVE'
  // - isPaused == false
  // - nextBillingDate <= targetDate
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      isPaused: false,
      nextBillingDate: {
        lte: targetDate,
      },
    },
    include: {
      customer: true,
      plan: true,
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  console.log(`🔍 [BillingEngine] Found ${dueSubscriptions.length} active subscription(s) due for billing.`);

  let createdCount = 0;
  let skippedCount = 0;
  const invoicesCreated: string[] = [];

  for (const sub of dueSubscriptions) {
    const cycleDate = sub.nextBillingDate || targetDate;
    const billingPeriod = formatBillingPeriod(cycleDate, sub.plan.billingPeriod);

    // IDEMPOTENCY CHECK:
    // Query database for existing invoice with (subscriptionId, billingPeriod)
    const existing = await prisma.invoice.findUnique({
      where: {
        subscriptionId_billingPeriod: {
          subscriptionId: sub.id,
          billingPeriod,
        },
      },
    });

    if (existing) {
      console.log(`⏩ [BillingEngine] Skipped: ${sub.subscriptionNumber} already billed for period ${billingPeriod}`);
      skippedCount++;
      // Advance nextBillingDate if it was stuck
      const nextDate = calculateNextBillingDate(cycleDate, sub.plan.billingPeriod);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: nextDate },
      });
      continue;
    }

    try {
      const invoiceNumber = await generateInvoiceNumber();
      const issueDate = new Date();

      // Calculate dueDate based on paymentTerms
      const dueDate = new Date(issueDate);
      if (sub.paymentTerms === 'NET_15') {
        dueDate.setDate(dueDate.getDate() + 15);
      } else if (sub.paymentTerms === 'NET_30') {
        dueDate.setDate(dueDate.getDate() + 30);
      } // IMMEDIATE leaves dueDate as issueDate

      // Prepare invoice line items
      let subtotal = sub.plan.price;
      let taxTotal = sub.plan.price * 0.18; // Standard 18% on plan

      const invoiceLinesData: any[] = [
        {
          productId: sub.lines[0]?.productId || (await prisma.product.findFirst())!.id,
          description: `Subscription Plan: ${sub.plan.name} (${sub.plan.billingPeriod})`,
          quantity: 1,
          unitPrice: sub.plan.price,
          taxRate: 18.0,
          taxAmount: sub.plan.price * 0.18,
          discountAmount: 0.0,
          lineTotal: sub.plan.price * 1.18,
        },
      ];

      for (const line of sub.lines) {
        const itemTaxRate = 18.0;
        const lineTax = (line.unitPrice * line.quantity * itemTaxRate) / 100;
        const lineTotal = line.unitPrice * line.quantity + lineTax;

        subtotal += line.unitPrice * line.quantity;
        taxTotal += lineTax;

        const variantDesc = line.variant ? ` (${line.variant.attributeValue})` : '';

        invoiceLinesData.push({
          productId: line.productId,
          variantId: line.variantId || null,
          description: `${line.product.name}${variantDesc}`,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: itemTaxRate,
          taxAmount: lineTax,
          discountAmount: line.discountAmount || 0.0,
          lineTotal,
        });
      }

      // Check for applicable active discounts
      let discountTotal = 0.0;
      const applicableDiscount = await prisma.discount.findFirst({
        where: {
          isActive: true,
          appliesTo: 'SUBSCRIPTION',
          usageCount: { lt: prisma.discount.fields.usageLimit },
        },
      });

      if (applicableDiscount) {
        if (applicableDiscount.type === 'PERCENTAGE') {
          discountTotal = (subtotal * applicableDiscount.value) / 100;
        } else {
          discountTotal = Math.min(subtotal, applicableDiscount.value);
        }

        // Increment discount usage
        await prisma.discount.update({
          where: { id: applicableDiscount.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      const totalAmount = Math.max(0, subtotal + taxTotal - discountTotal);

      // Create Invoice with lines
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          subscriptionId: sub.id,
          customerId: sub.customerId,
          billingPeriod,
          status: 'DRAFT', // Flow: DRAFT -> CONFIRMED -> PAID
          issueDate,
          dueDate,
          subtotal,
          taxTotal,
          discountTotal,
          totalAmount,
          paidAmount: 0.0,
          outstandingAmount: totalAmount,
          notes: `Automated recurring bill for ${sub.plan.name} (${billingPeriod})`,
          lines: {
            create: invoiceLinesData,
          },
        },
      });

      // Advance subscription's nextBillingDate
      const nextBillingDate = calculateNextBillingDate(cycleDate, sub.plan.billingPeriod);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate },
      });

      createdCount++;
      invoicesCreated.push(invoice.invoiceNumber);
    } catch (err: any) {
      // If unique constraint violation occurs concurrently, safely count as skipped
      if (err.code === 'P2002') {
        console.log(`🛡️ [BillingEngine] Idempotency constraint caught duplicate for ${sub.subscriptionNumber}`);
        skippedCount++;
      } else {
        console.error(`❌ [BillingEngine] Error billing ${sub.subscriptionNumber}:`, err);
      }
    }
  }

  console.log(`✅ [BillingEngine] Run complete: ${createdCount} created, ${skippedCount} skipped.`);

  return {
    runDate: targetDate.toISOString(),
    processedCount: dueSubscriptions.length,
    createdCount,
    skippedCount,
    invoicesCreated,
  };
}

