import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/config/env.server';
import { getValidShiprocketToken } from '@/modules/shipping/providers/shiprocket/token-manager';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const serviceabilityCache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get('pincode')?.trim() || searchParams.get('deliveryPincode')?.trim() || '';
    const cod = searchParams.get('cod') === 'true' || searchParams.get('cod') === '1';
    const weight = searchParams.get('weight') || '0.5';

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit delivery pincode' }, { status: 400 });
    }

    const cacheKey = `${pincode}_${cod}_${weight}`;
    const cached = serviceabilityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ success: true, ...cached.data, cached: true });
    }

    // Live Shiprocket serviceability lookup if configured
    if (serverEnv.SHIPPING_PROVIDER === 'shiprocket') {
      try {
        const token = await getValidShiprocketToken();
        const pickupPin = '560100'; // Default Indiranagar/Electronic City warehouse
        const sUrl = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPin}&delivery_postcode=${pincode}&weight=${weight}&cod=${cod ? 1 : 0}`;
        const sRes = await fetch(sUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (sRes.ok) {
          const sData = await sRes.json();
          const couriers = sData?.data?.available_courier_companies || [];
          const serviceable = couriers.length > 0;
          const codAvailable = cod ? couriers.some((c: any) => c.cod === 1) : false;
          const topCourier = couriers[0];
          const estimatedDays = topCourier?.estimated_delivery_days ? Number(topCourier.estimated_delivery_days) : 3;

          const result = {
            serviceable,
            codAvailable,
            courierName: topCourier?.courier_name || 'Express Courier',
            rate: topCourier?.rate || 0,
            estimatedDays,
            estimatedDeliveryDate: topCourier?.etd || new Date(Date.now() + estimatedDays * 86400000).toISOString().slice(0, 10),
            availableCouriersCount: couriers.length,
          };

          // Cache for 1 hour
          serviceabilityCache.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + 1 * 3600 * 1000,
          });

          return NextResponse.json({ success: true, ...result });
        }
      } catch (liveErr) {
        console.warn('Shiprocket live serviceability lookup failed, falling back to deterministic local check:', liveErr);
      }
    }

    // Deterministic fallback (for mock/offline mode)
    const serviceable = !pincode.startsWith('99');
    const estimatedDays = pincode.startsWith('56') ? 1 : pincode.startsWith('40') ? 2 : 4;

    const result = {
      serviceable,
      codAvailable: serviceable ? cod : false,
      courierName: 'Delhivery Surface',
      estimatedDays,
      estimatedDeliveryDate: new Date(Date.now() + estimatedDays * 86400000).toISOString().slice(0, 10),
      availableCouriersCount: 3,
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
