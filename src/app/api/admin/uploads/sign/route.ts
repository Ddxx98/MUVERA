import { NextResponse } from 'next/server';
import { mediaService } from '@/modules/media';
import { requireAdmin } from '@/modules/auth/guards';

export async function POST(req: Request) {
  try {
    // Layer 2: require admin session (Layer 1 middleware already verified aud=admin)
    const { user } = await requireAdmin();

    const { folder } = await req.json();
    const signatureData = mediaService.generateUploadSignature(folder || 'muvera/products');
    return NextResponse.json({ success: true, ...signatureData });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Signature generation failed' }, { status });
  }
}
