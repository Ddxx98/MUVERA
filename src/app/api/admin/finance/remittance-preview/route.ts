import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guards';
import { previewRemittance } from '@/modules/shipping/remittance';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { csvContent } = await req.json();

    if (!csvContent) {
      return NextResponse.json({ error: 'csvContent is required' }, { status: 400 });
    }

    const preview = await previewRemittance(csvContent);
    return NextResponse.json({ success: true, preview });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
