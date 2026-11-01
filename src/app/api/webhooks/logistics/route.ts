import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';
import { WebhookEventModel } from '@/lib/models';
import { connectToMongo } from '@/lib/db';
import { jobService } from '@/modules/jobs';
import { normalizeStatusLabel } from '@/modules/shipping/state-machine';

export async function POST(req: NextRequest) {
  try {
    // 1. Timing-safe authentication check with length guard
    const apiKey = req.headers.get('x-api-key') || '';
    const secret = serverEnv.LOGISTICS_WEBHOOK_SECRET;

    const apiKeyBuf = Buffer.from(apiKey);
    const secretBuf = Buffer.from(secret);

    if (
      apiKeyBuf.length !== secretBuf.length ||
      !crypto.timingSafeEqual(apiKeyBuf, secretBuf)
    ) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    // 2. Ensure database is connected
    const isDbReady = await connectToMongo();

    // 3. Parse payload safely (handles empty pings from Shiprocket test button)
    const payload = await req.json().catch(() => ({}));
    const awb = String(payload.awb || payload.shipment_id || '').trim();
    const status = normalizeStatusLabel(payload.current_status || payload.shipment_status || 'UNKNOWN');
    const currentTimestamp = String(payload.current_timestamp || '').trim();

    // Determine latest scan's timestamp from scans array
    const rawScans = Array.isArray(payload.scans) ? payload.scans : [];
    let latestScanTimestamp = '';
    for (const scan of rawScans) {
      if (scan.date && scan.date > latestScanTimestamp) {
        latestScanTimestamp = scan.date;
      }
    }

    // Deterministic event key (Never use Date.now())
    const eventKey = `${awb}_${status}_${currentTimestamp}_${latestScanTimestamp}`;

    if (isDbReady) {
      // 4. Insert-first deduplication in webhook_events
      const upsertRes = await WebhookEventModel.updateOne(
        { source: 'shiprocket', eventKey },
        {
          $setOnInsert: {
            source: 'shiprocket',
            eventKey,
            payload,
            status: 'received',
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // 5. Enqueue background processing job only if newly inserted
      if (upsertRes.upsertedCount > 0) {
        await jobService.enqueueJob(
          'process_logistics_event',
          { eventKey },
          { dedupeKey: `proc_logistics_${eventKey}` }
        );
      }
    } else {
      console.warn(`[Logistics Webhook] Database offline, recorded eventKey: ${eventKey}`);
    }

    // Always return HTTP 200 to Shiprocket for authenticated requests
    return NextResponse.json({ success: true, eventKey });
  } catch (err: any) {
    console.error('[LOGISTICS_WEBHOOK] Ingestion error:', err);
    // Shiprocket expects HTTP 200; return 200 with error note to avoid dropping carrier webhook
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Logistics webhook endpoint active' }, { status: 200 });
}
