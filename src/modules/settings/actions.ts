'use server';

import { revalidatePath } from 'next/cache';
import { settingsService } from './service';
import { SiteSettingsData } from './types';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { handleActionError, ServiceResult, AppError } from '@/lib/errors';

/**
 * Server Action: Saves dynamic website settings. Only accessible by admins.
 */
export async function saveSettingsAction(
  newSettings: Partial<SiteSettingsData>
): Promise<ServiceResult<SiteSettingsData>> {
  try {
    const currentUser = await getCurrentUserAction();
    const isAdmin =
      currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.email === 'deexith2016@gmail.com' ||
        currentUser.email === 'muveraclothing@gmail.com');

    if (process.env.NODE_ENV === 'production' && !isAdmin) {
      throw new AppError('UNAUTHORIZED', 'You must have administrative privileges to update site settings.');
    }

    const actor = currentUser ? `${currentUser.name} (${currentUser.email})` : 'Executive Admin';
    const updated = await settingsService.updateSettings(newSettings, actor);

    // Revalidate paths that use these live variables
    revalidatePath('/');
    revalidatePath('/checkout');
    revalidatePath('/products');
    revalidatePath('/admin/settings');
    revalidatePath('/admin');

    return { ok: true, data: updated };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server Action: Retrieves the current live site settings.
 */
export async function getSettingsAction(): Promise<ServiceResult<SiteSettingsData>> {
  try {
    const settings = await settingsService.getSettings();
    return { ok: true, data: settings };
  } catch (err) {
    return handleActionError(err);
  }
}
