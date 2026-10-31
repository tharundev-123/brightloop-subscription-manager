import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';
import prisma from '../src/utils/prisma.ts';
import { runBillingCycle, formatBillingPeriod } from '../src/services/billing.service.ts';

describe('Phase 5: Invoicing Engine & Idempotency Tests', () => {
  let staffToken: string;
  let testSub: any;

  beforeAll(async () => {
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@brightloop.io', password: 'Password123!' });
    staffToken = staffRes.body.token;

    // Create a fresh dedicated active subscription due for billing right now
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    const plan = await prisma.plan.findFirst({ where: { billingPeriod: 'MONTHLY' } });
    const product = await prisma.product.findFirst();

    testSub = await prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-IDEM-${Date.now()}`,
        customerId: customer!.id,
        planId: plan!.id,
        status: 'ACTIVE',
        isPaused: false,
        nextBillingDate: new Date('2026-10-15'), // Due in past
        paymentTerms: 'NET_15',
        totalAmount: 200,
        lines: {
          create: [
            {
              productId: product!.id,
              quantity: 1,
              unitPrice: 100,
              taxAmount: 18,
              totalAmount: 118,
            },
          ],
        },
      },
    });
  });

  it('generates an invoice on the first billing run', async () => {
    const billingDate = new Date('2026-10-15');
    const result1 = await runBillingCycle(billingDate);

    expect(result1.createdCount).toBeGreaterThanOrEqual(1);

    const expectedPeriod = formatBillingPeriod(billingDate, 'MONTHLY');
    const invoice = await prisma.invoice.findUnique({
      where: {
        subscriptionId_billingPeriod: {
          subscriptionId: testSub.id,
          billingPeriod: expectedPeriod,
        },
      },
    });

    expect(invoice).toBeDefined();
    expect(invoice?.status).toBe('DRAFT');
    expect(invoice?.billingPeriod).toBe(expectedPeriod);
  });

  it('STRICT IDEMPOTENCY: running billing run a second time creates 0 duplicates and skips gracefully', async () => {
    const billingDate = new Date('2026-10-15');
    const expectedPeriod = formatBillingPeriod(billingDate, 'MONTHLY');

    // Manually reset subscription nextBillingDate to force billing engine to re-inspect it
    await prisma.subscription.update({
      where: { id: testSub.id },
      data: { nextBillingDate: billingDate },
    });

    // Run the billing run a 2nd time!
    const result2 = await runBillingCycle(billingDate);

    // It must skip it!
    expect(result2.skippedCount).toBeGreaterThanOrEqual(1);

    // Exactly 1 invoice must exist in the database for (subscriptionId, billingPeriod)
    const invoices = await prisma.invoice.findMany({
      where: {
        subscriptionId: testSub.id,
        billingPeriod: expectedPeriod,
      },
    });

    expect(invoices).toHaveLength(1);
  });

  it('confirms and cancels an invoice through the status flow', async () => {
    const invoice = await prisma.invoice.findFirst({
      where: { subscriptionId: testSub.id },
    });
    expect(invoice).toBeDefined();

    // 1. Confirm invoice (DRAFT -> CONFIRMED)
    const confirmRes = await request(app)
      .put(`/api/invoices/${invoice!.id}/confirm`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.invoice.status).toBe('CONFIRMED');

    // 2. Cancel invoice (CONFIRMED -> CANCELLED)
    const cancelRes = await request(app)
      .put(`/api/invoices/${invoice!.id}/cancel`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.invoice.status).toBe('CANCELLED');
    expect(cancelRes.body.invoice.outstandingAmount).toBe(0);
  });

  it('triggers manual billing run from API endpoint', async () => {
    const res = await request(app)
      .post('/api/invoices/manual-run')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetDate: new Date() });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.runDate).toBeDefined();
  }, 25000);
});
