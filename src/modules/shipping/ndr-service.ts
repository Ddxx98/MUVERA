import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';
import { ShipmentModel, ShipmentScanModel } from '@/lib/models';

function getHmacSecret(): Buffer {
  const secret = serverEnv.LOGISTICS_WEBHOOK_SECRET || 'muvera_logistics_webhook_secret_32chars_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export interface NdrTokenData {
  shipmentId: string;
  awb: string;
  attempt: number;
  exp: number;
}

/**
 * Creates a signed HMAC token bound to a specific shipment and NDR attempt.
 */
export function generateNdrToken(shipmentId: string, awb: string, attempt: number, ttlHours = 48): string {
  const exp = Date.now() + ttlHours * 3600 * 1000;
  const payload = `${shipmentId}:${awb}:${attempt}:${exp}`;
  const hmac = crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
  const tokenRaw = `${payload}:${hmac}`;
  return Buffer.from(tokenRaw).toString('base64url');
}

/**
 * Validates the HMAC token in constant time with a length guard.
 */
export function verifyNdrToken(token: string): NdrTokenData {
  const decoded = Buffer.from(token, 'base64url').toString('utf8');
  const parts = decoded.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid NDR token format');
  }

  const [shipmentId, awb, attemptStr, expStr, signature] = parts;
  const payload = `${shipmentId}:${awb}:${attemptStr}:${expStr}`;
  const expectedHmac = crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');

  // Length guard prevents timingSafeEqual from throwing
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('NDR token signature mismatch');
  }

  const exp = parseInt(expStr, 10);
  if (Date.now() > exp) {
    throw new Error('NDR token has expired');
  }

  return {
    shipmentId,
    awb,
    attempt: parseInt(attemptStr, 10),
    exp,
  };
}

/**
 * Atomically consumes the NDR token for the given attempt.
 * Throws if the attempt was already submitted by the customer.
 */
export async function consumeNdrAttempt(
  shipmentId: string,
  attempt: number,
  instructions: { reattemptDate?: string; alternatePhone?: string; landmarkNotes?: string }
): Promise<void> {
  const shipment = await ShipmentModel.findById(shipmentId);
  if (!shipment) throw new Error('Shipment not found');

  if (shipment.status !== 'ndr_undelivered') {
    throw new Error(`Cannot submit NDR instructions when shipment is in '${shipment.status}' status`);
  }

  const consumed = await ShipmentModel.findOneAndUpdate(
    {
      _id: shipmentId,
      'ndr.usedAttempts': { $ne: attempt },
    },
    {
      $addToSet: { 'ndr.usedAttempts': attempt },
      $set: {
        'ndr.reattemptDate': instructions.reattemptDate,
        'ndr.lastInstructions': instructions.landmarkNotes,
      },
    },
    { new: true }
  );

  if (!consumed) {
    throw new Error('This reattempt link has already been used.');
  }
}

/**
 * Counts distinct NDR attempt scans from the shipmentScans collection.
 */
export async function countDistinctNdrAttempts(awb: string): Promise<number> {
  const ndrScans = await ShipmentScanModel.find({
    awb,
    status: { $in: ['UNDELIVERED', 'NDR', 'NDR RAISED', 'ATTEMPTED'] },
  });

  const distinctDates = new Set(ndrScans.map((s) => s.timestamp.toISOString().slice(0, 10)));
  return distinctDates.size;
}
