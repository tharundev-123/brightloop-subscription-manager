import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server.ts';

describe('Phase 2: Authentication & RBAC Tests', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  const validPassword = 'SecurePassword123!';

  it('rejects signup with weak passwords', async () => {
    // Too short (<= 8 chars)
    const res1 = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Short', email: 'short@example.com', password: 'Pass1!' });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/more than 8 characters/i);

    // Missing uppercase
    const res2 = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'No Upper', email: 'noupper@example.com', password: 'password123!' });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/uppercase/i);

    // Missing special character
    const res3 = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'No Special', email: 'nospecial@example.com', password: 'Password123' });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toMatch(/special character/i);
  });

  it('successfully signs up a customer with valid credentials and sets CUSTOMER role', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test Customer', email: testEmail, password: validPassword });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('CUSTOMER');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('prevents duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Duplicate User', email: testEmail, password: validPassword });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('logs in seeded admin and rejects wrong password', async () => {
    // Correct login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.io', password: 'Password123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.role).toBe('ADMIN');

    // Wrong password
    const failRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.io', password: 'WrongPassword999!' });

    expect(failRes.status).toBe(401);
  });

  it('executes forgot password and single-use reset password cycle', async () => {
    // 1. Request forgot password
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testEmail });

    expect(forgotRes.status).toBe(200);
    const token = forgotRes.body.devResetToken;
    expect(token).toBeDefined();

    // 2. Reset password with new password
    const newPassword = 'NewSecretPassword2026!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword });

    expect(resetRes.status).toBe(200);

    // 3. Verify old password no longer works
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: validPassword });
    expect(oldLoginRes.status).toBe(401);

    // 4. Verify new password works
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: newPassword });
    expect(newLoginRes.status).toBe(200);

    // 5. Verify single-use token cannot be reused
    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'AnotherPassword123!' });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error).toMatch(/invalid or has expired/i);
  }, 15000); // 15s timeout for Ethereal email dispatch

  it('strictly enforces RBAC on staff creation', async () => {
    // Login as Customer (using seeded customer)
    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'contact@acmecorp.com', password: 'Password123!' });
    const customerToken = customerLogin.body.token;
    expect(customerToken).toBeDefined();

    // Login as Staff
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff1@brightloop.io', password: 'Password123!' });
    const staffToken = staffLogin.body.token;
    expect(staffToken).toBeDefined();

    // Login as Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.io', password: 'Password123!' });
    const adminToken = adminLogin.body.token;
    expect(adminToken).toBeDefined();

    const newStaffData = {
      name: 'New Field Staff',
      email: `staff_${Date.now()}@brightloop.io`,
      password: 'StaffPassword123!',
    };

    // 1. Customer attempt -> 403 Forbidden
    const custAttempt = await request(app)
      .post('/api/users/staff')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(newStaffData);
    expect(custAttempt.status).toBe(403);

    // 2. Staff attempt -> 403 Forbidden (Staff cannot create staff)
    const staffAttempt = await request(app)
      .post('/api/users/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(newStaffData);
    expect(staffAttempt.status).toBe(403);

    // 3. Admin attempt -> 201 Created
    const adminAttempt = await request(app)
      .post('/api/users/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStaffData);
    expect(adminAttempt.status).toBe(201);
    expect(adminAttempt.body.user.role).toBe('STAFF');
  });
});
