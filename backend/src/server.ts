import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.ts';
import userRoutes from './routes/user.routes.ts';
import productRoutes from './routes/product.routes.ts';
import planRoutes from './routes/plan.routes.ts';
import taxRoutes from './routes/tax.routes.ts';
import discountRoutes from './routes/discount.routes.ts';
import templateRoutes from './routes/template.routes.ts';
import subscriptionRoutes from './routes/subscription.routes.ts';
import invoiceRoutes from './routes/invoice.routes.ts';
import paymentRoutes from './routes/payment.routes.ts';
import dashboardRoutes from './routes/dashboard.routes.ts';
import portalRoutes from './routes/portal.routes.ts';
import creditNoteRoutes from './routes/creditNote.routes.ts';
import usageRoutes from './routes/usage.routes.ts';
import auditRoutes from './routes/audit.routes.ts';
import odooRoutes from './routes/odoo.routes.ts';
import exportRoutes from './routes/export.routes.ts';
import { initBillingCron } from './cron/billing.cron.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Brightloop Subscription Management API',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/odoo', odooRoutes);
app.use('/api/export', exportRoutes);

// Central Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

if (process.env.NODE_ENV !== 'test') {
  initBillingCron();
  app.listen(PORT, () => {
    console.log(`🚀 Brightloop Backend running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
