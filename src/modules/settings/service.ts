import { db } from '@/lib/db';
import { SiteSettingsData } from './types';
import { auditService } from '@/modules/audit';

export const settingsService = {
  /**
   * Fetches the singleton dynamic site settings from DB.
   */
  async getSettings(): Promise<SiteSettingsData> {
    return db.getSiteSettings();
  },

  /**
   * Updates site settings with audit log tracking.
   */
  async updateSettings(
    newSettings: Partial<SiteSettingsData>,
    actor = 'Executive Admin'
  ): Promise<SiteSettingsData> {
    const previous = await db.getSiteSettings();
    const updated = await db.saveSiteSettings(newSettings, actor);

    await auditService.recordAudit({
      action: 'SITE_SETTINGS_UPDATE',
      entity: 'settings' as any,
      entityId: 'global',
      actor,
      before: previous as any,
      after: updated as any,
    });

    return updated;
  },
};
