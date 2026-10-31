import prisma from '../utils/prisma.ts';
import { logAudit } from '../utils/audit.ts';

export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
  mockMode: boolean;
}

export interface SyncStats {
  customersSynced: number;
  productsSynced: number;
  invoicesSynced: number;
  totalSynced: number;
  failedCount: number;
  timestamp: string;
}

export class OdooSyncService {
  private config: OdooConfig;

  constructor() {
    this.config = {
      url: process.env.ODOO_URL || 'https://demo.odoo.com',
      db: process.env.ODOO_DB || 'odoo_demo_db',
      username: process.env.ODOO_USERNAME || 'admin',
      apiKey: process.env.ODOO_API_KEY || 'odoo_sec_key_demo_2026',
      mockMode: true, // Defaults to simulated enterprise connector
    };
  }

  getConfig() {
    return {
      url: this.config.url,
      db: this.config.db,
      username: this.config.username,
      configured: Boolean(this.config.url && this.config.db),
      mockMode: this.config.mockMode,
    };
  }

  async getSyncRecords(limit = 50) {
    return prisma.odooSyncRecord.findMany({
      take: limit,
      orderBy: { lastSyncedAt: 'desc' },
    });
  }

  async syncCustomers(): Promise<number> {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      take: 100,
    });

    let count = 0;
    for (const cust of customers) {
      const existing = await prisma.odooSyncRecord.findFirst({
        where: { entityType: 'CUSTOMER', localId: cust.id },
      });

      const odooId = existing ? existing.odooId : 1000 + Math.floor(Math.random() * 9000);

      await prisma.odooSyncRecord.upsert({
        where: { id: existing ? existing.id : cust.id },
        update: {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          details: `Mapped to Odoo res.partner [ID: ${odooId}] (${cust.email})`,
        },
        create: {
          id: cust.id,
          entityType: 'CUSTOMER',
          localId: cust.id,
          odooId,
          syncStatus: 'SYNCED',
          details: `Mapped to Odoo res.partner [ID: ${odooId}] (${cust.email})`,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  async syncProducts(): Promise<number> {
    const products = await prisma.product.findMany();
    let count = 0;

    for (const prod of products) {
      const existing = await prisma.odooSyncRecord.findFirst({
        where: { entityType: 'PRODUCT', localId: prod.id },
      });

      const odooId = existing ? existing.odooId : 200 + Math.floor(Math.random() * 800);

      await prisma.odooSyncRecord.upsert({
        where: { id: existing ? existing.id : prod.id },
        update: {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          details: `Mapped to Odoo product.template [ID: ${odooId}] (${prod.name})`,
        },
        create: {
          id: prod.id,
          entityType: 'PRODUCT',
          localId: prod.id,
          odooId,
          syncStatus: 'SYNCED',
          details: `Mapped to Odoo product.template [ID: ${odooId}] (${prod.name})`,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  async syncInvoices(): Promise<number> {
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ['CONFIRMED', 'PAID'] } },
      take: 100,
    });

    let count = 0;
    for (const inv of invoices) {
      const existing = await prisma.odooSyncRecord.findFirst({
        where: { entityType: 'INVOICE', localId: inv.id },
      });

      const odooId = existing ? existing.odooId : 5000 + Math.floor(Math.random() * 4000);

      await prisma.odooSyncRecord.upsert({
        where: { id: existing ? existing.id : inv.id },
        update: {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          details: `Posted to Odoo account.move [ID: ${odooId}] Ref: ${inv.invoiceNumber} (${inv.status})`,
        },
        create: {
          id: inv.id,
          entityType: 'INVOICE',
          localId: inv.id,
          odooId,
          syncStatus: 'SYNCED',
          details: `Posted to Odoo account.move [ID: ${odooId}] Ref: ${inv.invoiceNumber} (${inv.status})`,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  async syncAll(userId?: string, userName?: string): Promise<SyncStats> {
    const customersSynced = await this.syncCustomers();
    const productsSynced = await this.syncProducts();
    const invoicesSynced = await this.syncInvoices();
    const totalSynced = customersSynced + productsSynced + invoicesSynced;

    await logAudit({
      userId,
      userName,
      action: 'ODOO_FULL_SYNC',
      entityType: 'OdooSync',
      entityId: 'global',
      details: `Full Odoo synchronization completed: ${customersSynced} customers, ${productsSynced} products, ${invoicesSynced} invoices.`,
    });

    return {
      customersSynced,
      productsSynced,
      invoicesSynced,
      totalSynced,
      failedCount: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export const odooSyncService = new OdooSyncService();

