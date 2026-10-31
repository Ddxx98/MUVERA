import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guards';
import { commitRemittanceImport } from '@/modules/shipping/remittance';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { csvContent } = await req.json();

    if (!csvContent) {
      return NextResponse.json({ error: 'csvContent is required' }, { status: 400 });
    }

    const result = await commitRemittanceImport(csvContent, admin.user.email);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    const status = err.message.includes('Duplicate remittance') ? 409 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
