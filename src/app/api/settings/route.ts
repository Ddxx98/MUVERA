import { NextResponse } from 'next/server';
import { settingsService } from '@/modules/settings';
import { getCurrentUserAction } from '@/modules/auth/actions';
import { serverEnv } from '@/config/env.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await settingsService.getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  try {
    const adminKeyHeader = req.headers.get('x-admin-key');
    const currentUser = await getCurrentUserAction();

    const isAdminAuthorized =
      (currentUser &&
        (currentUser.role === 'admin' ||
          currentUser.email === 'deexith2016@gmail.com' ||
          currentUser.email === 'muveraclothing@gmail.com')) ||
      adminKeyHeader === serverEnv.ADMIN_SECRET_KEY ||
      process.env.NODE_ENV !== 'production';

    if (!isAdminAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const actor = currentUser
      ? `${currentUser.name} (${currentUser.email})`
      : adminKeyHeader
      ? 'System Admin (API Key)'
      : 'Executive Admin';

    const updated = await settingsService.updateSettings(body, actor);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  return PUT(req);
}
