import { NextResponse } from 'next/server';
import { settingsService } from '@/modules/settings';
import { requireAdmin } from '@/modules/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Public: storefront reads site settings for CMS values
  const settings = await settingsService.getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  try {
    // Layer 2: require admin session — removes all previous dev bypasses and API key checks
    const { user } = await requireAdmin();

    const body = await req.json();
    const actor = `${user.name} (${user.email})`;

    const updated = await settingsService.updateSettings(body, actor);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status });
  }
}

// Keep POST as an alias for PUT (some admin panels use POST for update)
export async function POST(req: Request) {
  return PUT(req);
}
