import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';
import prisma from '../src/utils/prisma.ts';

describe('Phase 6: Payments & Partial Payment Flow Tests', () => {
  let staffToken: string;
  let testInvoice: any;

  beforeAll(async () => {
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@brightloop.io', password: 'Password123!' });
    staffToken = staffRes.body.token;

    // Create an unpaid invoice with total $300
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    const sub = await prisma.subscription.findFirst({ where: { customerId: customer!.id } });

    testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-PAYTEST-${Date.now()}`,
        subscriptionId: sub!.id,
        customerId: customer!.id,
        billingPeriod: `TEST-${Date.now()}`,
        status: 'CONFIRMED',
        issueDate: new Date(),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Due 5 days ago (Overdue!)
        subtotal: 250,
        taxTotal: 50,
        totalAmount: 300,
        paidAmount: 0,
        outstandingAmount: 300,
      },
    });
  });

  it('records a partial payment, leaves balance, and maintains status', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        invoiceId: testInvoice.id,
        amount: 100,
        paymentMethod: 'UPI',
        notes: 'Partial payment 1 of 2',
      });

    expect(res.status).toBe(201);
    expect(res.body.payment.paymentNumber).toMatch(/^PAY-\d{5}$/);
    expect(res.body.invoice.paidAmount).toBe(100);
    expect(res.body.invoice.outstandingAmount).toBe(200);
    expect(res.body.invoice.status).toBe('CONFIRMED');
  });

  it('rejects overpayments exceeding outstanding balance', async () => {
    // Current outstanding is 200, try paying 250
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        invoiceId: testInvoice.id,
        amount: 250,
        paymentMethod: 'CARD',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot exceed the outstanding balance/i);
  });

  it('records the remainder payment and automatically transitions invoice to PAID', async () => {
    // Pay remaining $200
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        invoiceId: testInvoice.id,
        amount: 200,
        paymentMethod: 'BANK_TRANSFER',
        notes: 'Final settlement payment',
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice.paidAmount).toBe(300);
    expect(res.body.invoice.outstandingAmount).toBe(0);
    expect(res.body.invoice.status).toBe('PAID');
  });

  it('retrieves overdue invoices list with server-side filtering', async () => {
    const res = await request(app)
      .get('/api/payments/overdue')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);

    // Verify all returned overdue invoices actually have dueDate < now and outstanding > 0
    const now = new Date();
    res.body.data.forEach((inv: any) => {
      expect(inv.status).toBe('CONFIRMED');
      expect(new Date(inv.dueDate).getTime()).toBeLessThan(now.getTime());
      expect(inv.outstandingAmount).toBeGreaterThan(0);
    });
  });
});

