import prisma from './prisma.ts';

export interface AuditParams {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
  ipAddress?: string | null;
}

export async function logAudit(params: AuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || 'System Engine',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('⚠️ [AuditLog] Failed to record audit log:', err);
    return null;
  }
}

