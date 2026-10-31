import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';

describe('Phase 3: Catalog, Plans, Taxes & Discounts Tests', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Log in as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.io', password: 'Password123!' });
    adminToken = adminRes.body.token;

    // Log in as Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@brightloop.io', password: 'Password123!' });
    staffToken = staffRes.body.token;
  });

  it('allows Admin to create a product with variants (e.g. Brand = Odoo adds 560)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Brightloop Custom Connector',
        type: 'SOFTWARE',
        salesPrice: 400,
        costPrice: 100,
        notes: 'Integration module with enterprise variant support',
        variants: [
          {
            attributeName: 'Brand',
            attributeValue: 'Odoo',
            extraPrice: 560,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.product.name).toBe('Brightloop Custom Connector');
    expect(res.body.product.variants).toHaveLength(1);
    expect(res.body.product.variants[0].attributeName).toBe('Brand');
    expect(res.body.product.variants[0].attributeValue).toBe('Odoo');
    expect(res.body.product.variants[0].extraPrice).toBe(560);
  });

  it('rejects product creation by Staff with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Staff Product Attempt',
        type: 'SOFTWARE',
        salesPrice: 100,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('allows Admin to create a Plan with policy flags', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Quarterly Pro Plan',
        price: 250,
        billingPeriod: 'MONTHLY',
        minQuantity: 2,
        autoCloseAtEnd: false,
        allowEarlyClose: true,
        allowPause: true,
        allowRenewal: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.plan.name).toBe('Quarterly Pro Plan');
    expect(res.body.plan.allowPause).toBe(true);
    expect(res.body.plan.minQuantity).toBe(2);
  });

  it('rejects plan creation by Staff with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Unauthorized Plan',
        price: 50,
      });

    expect(res.status).toBe(403);
  });

  it('allows Admin to create tax rules and discounts, and validates discount calculation', async () => {
    // 1. Create Tax Rule
    const taxRes = await request(app)
      .post('/api/taxes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'State Tax 6%',
        percentage: 6.0,
        appliesTo: 'ALL',
      });
    expect(taxRes.status).toBe(201);
    expect(taxRes.body.tax.percentage).toBe(6);

    // 2. Create Discount (20% off with min purchase $200)
    const code = `TESTPROMO_${Date.now()}`;
    const discRes = await request(app)
      .post('/api/discounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code,
        type: 'PERCENTAGE',
        value: 20,
        minPurchaseAmount: 200,
        usageLimit: 10,
        appliesTo: 'SUBSCRIPTION',
      });
    expect(discRes.status).toBe(201);
    expect(discRes.body.discount.code).toBe(code);

    // 3. Validate discount when order amount is below minimum ($150 < $200) -> fails validation
    const valFail = await request(app)
      .post('/api/discounts/validate')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ code, amount: 150 });
    expect(valFail.status).toBe(400);
    expect(valFail.body.error).toMatch(/Minimum order amount of \$200.00 required/i);

    // 4. Validate discount when order amount satisfies minimum ($500 >= $200) -> 20% of 500 = $100
    const valPass = await request(app)
      .post('/api/discounts/validate')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ code, amount: 500 });
    expect(valPass.status).toBe(200);
    expect(valPass.body.valid).toBe(true);
    expect(valPass.body.discountAmount).toBe(100);
  });
});

