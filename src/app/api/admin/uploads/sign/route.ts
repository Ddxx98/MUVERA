import { NextResponse } from 'next/server';
import { mediaService } from '@/modules/media';
import { serverEnv } from '@/config/env.server';

export async function POST(req: Request) {
  try {
    const { folder, adminSecret } = await req.json();

    // Verify admin secret
    if (adminSecret !== serverEnv.ADMIN_SECRET_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const signatureData = mediaService.generateUploadSignature(folder || 'muvera/products');
    return NextResponse.json({ success: true, ...signatureData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Signature generation failed' }, { status: 500 });
  }
}
