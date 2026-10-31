import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';
import prisma from '../src/utils/prisma.ts';

describe('Phase 4: Templates & Subscriptions Status Flow Tests', () => {
  let staffToken: string;
  let customerUser: any;
  let testTemplate: any;
  let monthlyPlan: any;
  let dailyPlan: any;

  beforeAll(async () => {
    // Staff login
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@brightloop.io', password: 'Password123!' });
    staffToken = staffRes.body.token;

    // Pick customer, template, and plans from seeded DB
    customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    testTemplate = await prisma.quotationTemplate.findFirst({ include: { lines: true, plan: true } });
    monthlyPlan = await prisma.plan.findFirst({ where: { billingPeriod: 'MONTHLY', allowPause: true } });
    dailyPlan = await prisma.plan.findFirst({ where: { billingPeriod: 'DAILY', allowPause: false } });
  });

  it('instantiates a subscription from a template in 1-click with unique SUB number and lines', async () => {
    const res = await request(app)
      .post('/api/subscriptions/from-template')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        templateId: testTemplate.id,
        customerId: customerUser.id,
        paymentTerms: 'NET_15',
      });

    expect(res.status).toBe(201);
    expect(res.body.subscription.subscriptionNumber).toMatch(/^SUB-\d{5}$/);
    expect(res.body.subscription.status).toBe('QUOTATION');
    expect(res.body.subscription.customerId).toBe(customerUser.id);
    expect(res.body.subscription.lines.length).toBeGreaterThan(0);
  });

  it('strictly enforces valid status transitions and rejects invalid leaps', async () => {
    // 1. Create a draft subscription
    const product = await prisma.product.findFirst();
    const createRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: customerUser.id,
        planId: monthlyPlan.id,
        paymentTerms: 'IMMEDIATE',
        lines: [
          {
            productId: product!.id,
            quantity: 1,
            unitPrice: 500,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const subId = createRes.body.subscription.id;
    expect(createRes.body.subscription.status).toBe('DRAFT');

    // 2. Illegal leap: Try transitioning directly from DRAFT to ACTIVE -> Should fail with 400
    const illegalRes = await request(app)
      .put(`/api/subscriptions/${subId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetStatus: 'ACTIVE' });

    expect(illegalRes.status).toBe(400);
    expect(illegalRes.body.error).toMatch(/Invalid status transition/i);

    // 3. Step 1: DRAFT -> QUOTATION (Valid)
    const quoteRes = await request(app)
      .put(`/api/subscriptions/${subId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetStatus: 'QUOTATION' });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.subscription.status).toBe('QUOTATION');

    // 4. Step 2: QUOTATION -> CONFIRMED (Valid)
    const confirmRes = await request(app)
      .put(`/api/subscriptions/${subId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetStatus: 'CONFIRMED' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.subscription.status).toBe('CONFIRMED');

    // 5. Step 3: CONFIRMED -> ACTIVE (Valid)
    const activeRes = await request(app)
      .put(`/api/subscriptions/${subId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetStatus: 'ACTIVE' });
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.subscription.status).toBe('ACTIVE');
    expect(activeRes.body.subscription.nextBillingDate).toBeDefined();

    // 6. Step 4: ACTIVE -> CLOSED (Valid)
    const closeRes = await request(app)
      .put(`/api/subscriptions/${subId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ targetStatus: 'CLOSED' });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.subscription.status).toBe('CLOSED');
  });

  it('governs pause and resume by plan policy flags', async () => {
    const product = await prisma.product.findFirst();

    // Create an ACTIVE subscription on the plan where allowPause = false (Daily Trial)
    const noPauseSub = await prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-TEST-${Date.now()}`,
        customerId: customerUser.id,
        planId: dailyPlan.id,
        status: 'ACTIVE',
        totalAmount: 10,
      },
    });

    const pauseFail = await request(app)
      .post(`/api/subscriptions/${noPauseSub.id}/pause`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(pauseFail.status).toBe(400);
    expect(pauseFail.body.error).toMatch(/not permitted/i);

    // Create an ACTIVE subscription on monthly plan where allowPause = true
    const allowPauseSub = await prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-PAUSE-${Date.now()}`,
        customerId: customerUser.id,
        planId: monthlyPlan.id,
        status: 'ACTIVE',
        isPaused: false,
        totalAmount: 100,
      },
    });

    const pausePass = await request(app)
      .post(`/api/subscriptions/${allowPauseSub.id}/pause`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(pausePass.status).toBe(200);
    expect(pausePass.body.subscription.isPaused).toBe(true);

    const resumePass = await request(app)
      .post(`/api/subscriptions/${allowPauseSub.id}/pause`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resumePass.status).toBe(200);
    expect(resumePass.body.subscription.isPaused).toBe(false);
  });
});

