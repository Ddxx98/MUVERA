import mongoose from 'mongoose';
import { AuditLogModel, IAuditLog } from './model';
import { logger } from '@/lib/logger';

export interface AuditEntry {
  action: string;
  entity: 'product' | 'inventory' | 'order' | 'coupon' | 'return' | 'location' | 'settings' | 'user' | 'customer' | 'auth';
  entityId: string;
  actor: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

declare global {
  var _muveraAuditLogs: Array<AuditEntry & { id: string; createdAt: Date }> | undefined;
}

if (!global._muveraAuditLogs) {
  global._muveraAuditLogs = [];
}

function isDbConnected(): boolean {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

export const auditService = {
  /**
   * Records an immutable audit log entry for administrative changes.
   */
  async recordAudit(entry: AuditEntry): Promise<void> {
    logger.info(`[AUDIT] ${entry.actor} performed ${entry.action} on ${entry.entity} ${entry.entityId}`);

    if (isDbConnected()) {
      try {
        await AuditLogModel.create(entry);
        return;
      } catch (err) {
        logger.warn('Failed saving audit log in Mongo', { err: String(err) });
      }
    }

    global._muveraAuditLogs!.unshift({
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date(),
    });

    // Keep memory cache trimmed
    if (global._muveraAuditLogs!.length > 200) {
      global._muveraAuditLogs!.length = 200;
    }
  },

  /**
   * Queries recent audit logs for an entity or system-wide.
   */
  async getAuditLogs(filter: { entity?: string; entityId?: string; limit?: number } = {}) {
    const limit = filter.limit || 50;

    if (isDbConnected()) {
      try {
        const query: Record<string, unknown> = {};
        if (filter.entity) query.entity = filter.entity;
        if (filter.entityId) query.entityId = filter.entityId;

        const docs = await AuditLogModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
        if (docs.length > 0) return docs;
      } catch (err) {
        logger.warn('Failed querying audit logs from Mongo', { err: String(err) });
      }
    }

    let logs = global._muveraAuditLogs!;
    if (filter.entity) {
      logs = logs.filter((l) => l.entity === filter.entity);
    }
    if (filter.entityId) {
      logs = logs.filter((l) => l.entityId === filter.entityId);
    }
    return logs.slice(0, limit);
  },
};
