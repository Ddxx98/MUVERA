import { NextRequest, NextResponse } from 'next/server';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const serviceabilityCache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get('pincode')?.trim() || '';
    const cod = searchParams.get('cod') === 'true';
    const weight = searchParams.get('weight') || '0.5';

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit delivery pincode' }, { status: 400 });
    }

    const cacheKey = `${pincode}_${cod}_${weight}`;
    const cached = serviceabilityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, ...cached.data, cached: true });
    }

    // In local/mock mode, evaluate serviceability deterministically
    const serviceable = !pincode.startsWith('99');
    const estimatedDays = pincode.startsWith('56') ? 1 : pincode.startsWith('40') ? 2 : 4;

    const result = {
      serviceable,
      codAvailable: serviceable ? cod : false,
      courierName: 'Delhivery Surface',
      estimatedDays,
      estimatedDeliveryDate: new Date(Date.now() + estimatedDays * 86400000).toISOString().slice(0, 10),
    };

    // Cache for 6 hours
    serviceabilityCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 6 * 3600 * 1000,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: 'Serviceability check temporarily unavailable' }, { status: 500 });
  }
}
