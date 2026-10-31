import { Request, Response } from 'express';
import { odooSyncService } from '../services/odoo.service.ts';

export async function getOdooStatus(req: Request, res: Response) {
  try {
    const config = odooSyncService.getConfig();
    const recentRecords = await odooSyncService.getSyncRecords(10);
    res.json({
      status: 'CONNECTED',
      config,
      recentRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function triggerOdooSync(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user;
    const stats = await odooSyncService.syncAll(currentUser?.id, currentUser?.name);
    res.json({
      message: 'Odoo bi-directional synchronization completed successfully.',
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getOdooRecords(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const records = await odooSyncService.getSyncRecords(limit);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

