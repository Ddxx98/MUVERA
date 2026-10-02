import mongoose from 'mongoose';

declare global {
  var _muveraCounters: Record<string, number> | undefined;
}

if (!global._muveraCounters) {
  global._muveraCounters = {
    ORDER: 100024,
    'INV:26-27': 1004,
  };
}

/**
 * Generates an atomic sequential number for a given series key.
 * Uses MongoDB findOneAndUpdate with $inc if available, falls back to memory counter.
 */
export async function getNextSequence(seriesKey: string, initialSeq = 100000): Promise<number> {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const collection = mongoose.connection.collection('counters');
      const doc = await collection.findOneAndUpdate(
        { _id: seriesKey as any },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );

      if (doc && typeof doc.seq === 'number') {
        return doc.seq;
      }
    }
  } catch (err) {
    console.warn(`Counter error for series ${seriesKey}, using in-memory fallback:`, err);
  }

  // In-memory fallback
  if (!global._muveraCounters![seriesKey]) {
    global._muveraCounters![seriesKey] = initialSeq;
  }
  global._muveraCounters![seriesKey] += 1;
  return global._muveraCounters![seriesKey];
}

/**
 * Generates customer-facing order number: MUVERA-100025
 */
export async function generateOrderNumber(): Promise<string> {
  const seq = await getNextSequence('ORDER', 100000);
  return `MUVERA-${seq}`;
}

/**
 * Generates regulatory gapless invoice number: INV/26-27/000105
 */
export async function generateInvoiceNumber(financialYear = '26-27'): Promise<string> {
  const seq = await getNextSequence(`INV:${financialYear}`, 1);
  return `INV/${financialYear}/${String(seq).padStart(6, '0')}`;
}
