import crypto from 'crypto';
import { CodRemittanceModel, ShipmentModel } from '@/lib/models';
import { auditService } from '@/modules/audit/service';

/**
 * Strips currency symbols and thousands separators, then validates and converts
 * a rupee decimal string into an exact integer number of paise.
 * Throws on any invalid, empty, or multi-decimal input.
 */
export function parseRupeesToPaise(input?: string | null): number {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid rupee input: value is empty or not a string');
  }

  // Strip currency symbols (₹, INR, Rs., Rs) and thousands separators (,)
  const cleaned = input
    .replace(/(?:Rs\.?|INR|₹)/gi, '')
    .replace(/[\s,]/g, '')
    .trim();

  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid rupee amount for remittance: "${input}"`);
  }

  const isNegative = cleaned.startsWith('-');
  const unsigned = isNegative ? cleaned.slice(1) : cleaned;

  const [whole, dec = ''] = unsigned.split('.');
  const cents = (dec + '00').slice(0, 2);
  const paise = parseInt(whole, 10) * 100 + parseInt(cents, 10);

  return isNegative ? -paise : paise;
}

export interface RemittanceCsvRow {
  crfId: string;
  utr: string;
  awb: string;
  date: string;
  collectedRupees: string;
  feesRupees: string;
  netRupees: string;
}

export interface RemittancePreviewResult {
  fileHash: string;
  crfId: string;
  utr: string;
  transferDate: string;
  totalRows: number;
  matchedCount: number;
  unmatchedAwbs: string[];
  grossCollectedPaise: number;
  courierFeesPaise: number;
  netRemittedPaise: number;
  variancePaise: number;
}

export function parseRemittanceCsv(csvContent: string): { rows: RemittanceCsvRow[]; fileHash: string } {
  const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Remittance CSV must contain a header and at least one data row');
  }

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const crfIdx = headers.findIndex((h) => h.includes('crf'));
  const utrIdx = headers.findIndex((h) => h.includes('utr'));
  const awbIdx = headers.findIndex((h) => h.includes('awb'));
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const collIdx = headers.findIndex((h) => h.includes('collect') || h.includes('gross'));
  const feeIdx = headers.findIndex((h) => h.includes('fee') || h.includes('charge'));
  const netIdx = headers.findIndex((h) => h.includes('net') || h.includes('remit'));

  if (crfIdx === -1 || utrIdx === -1 || awbIdx === -1) {
    throw new Error('Remittance CSV missing required columns: CRF, UTR, AWB');
  }

  const rows: RemittanceCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < headers.length) continue;

    rows.push({
      crfId: cols[crfIdx],
      utr: cols[utrIdx],
      awb: cols[awbIdx],
      date: dateIdx !== -1 ? cols[dateIdx] : new Date().toISOString().slice(0, 10),
      collectedRupees: collIdx !== -1 ? cols[collIdx] : '0',
      feesRupees: feeIdx !== -1 ? cols[feeIdx] : '0',
      netRupees: netIdx !== -1 ? cols[netIdx] : '0',
    });
  }

  return { rows, fileHash };
}

export async function previewRemittance(csvContent: string): Promise<RemittancePreviewResult> {
  const { rows, fileHash } = parseRemittanceCsv(csvContent);

  const crfId = rows[0]?.crfId || 'UNKNOWN_CRF';
  const utr = rows[0]?.utr || 'UNKNOWN_UTR';
  const transferDate = rows[0]?.date || new Date().toISOString().slice(0, 10);

  const awbs = rows.map((r) => r.awb);
  const matchedShipments = await ShipmentModel.find({ awb: { $in: awbs } });
  const matchedAwbSet = new Set(matchedShipments.map((s) => s.awb));

  const unmatchedAwbs: string[] = [];
  let grossPaise = 0;
  let feesPaise = 0;
  let netPaise = 0;

  for (const row of rows) {
    if (!matchedAwbSet.has(row.awb)) {
      unmatchedAwbs.push(row.awb);
    }
    grossPaise += parseRupeesToPaise(row.collectedRupees);
    feesPaise += parseRupeesToPaise(row.feesRupees);
    netPaise += parseRupeesToPaise(row.netRupees);
  }

  const expectedNet = grossPaise - feesPaise;
  const variancePaise = netPaise - expectedNet;

  return {
    fileHash,
    crfId,
    utr,
    transferDate,
    totalRows: rows.length,
    matchedCount: matchedShipments.length,
    unmatchedAwbs,
    grossCollectedPaise: grossPaise,
    courierFeesPaise: feesPaise,
    netRemittedPaise: netPaise,
    variancePaise,
  };
}

export async function commitRemittanceImport(
  csvContent: string,
  actor: string
): Promise<{ batchNo: string; matchedCount: number }> {
  const { rows, fileHash } = parseRemittanceCsv(csvContent);

  const crfId = rows[0]?.crfId;
  const utr = rows[0]?.utr;
  const transferDate = rows[0]?.date;

  // 1. Duplicate CRF check
  const existingCrf = await CodRemittanceModel.findOne({ crfId });
  if (existingCrf) {
    throw new Error(`Duplicate remittance: CRF ID "${crfId}" has already been imported`);
  }

  // 2. Recompute strictly from file
  const awbs = rows.map((r) => r.awb);
  const matchedShipments = await ShipmentModel.find({ awb: { $in: awbs } });
  const matchedIds = matchedShipments.map((s) => s.id);

  let grossPaise = 0;
  let feesPaise = 0;
  let netPaise = 0;

  for (const row of rows) {
    grossPaise += parseRupeesToPaise(row.collectedRupees);
    feesPaise += parseRupeesToPaise(row.feesRupees);
    netPaise += parseRupeesToPaise(row.netRupees);
  }

  const batchNo = `REMIT_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // 3. Create batch record
  await CodRemittanceModel.create({
    batchNo,
    crfId,
    utr,
    fileHash,
    transferDate,
    grossCollectedPaise: grossPaise,
    courierFeesPaise: feesPaise,
    netRemittedPaise: netPaise,
    shipmentCount: matchedShipments.length,
    shipmentIds: matchedIds,
    variancePaise: netPaise - (grossPaise - feesPaise),
    importedBy: actor,
    status: 'reconciled',
  });

  // 4. Update matched shipments
  if (matchedShipments.length > 0) {
    await ShipmentModel.updateMany(
      { awb: { $in: awbs } },
      {
        $set: {
          'cod.remitted': true,
          'cod.remittanceUtr': utr,
          'cod.remittanceBatchId': batchNo,
        },
      }
    );
  }

  await auditService.recordAudit({
    action: 'COD_REMITTANCE_IMPORTED',
    entity: 'order',
    entityId: batchNo,
    actor,
    metadata: { batchNo, crfId, utr, matchedCount: matchedShipments.length, netRemittedPaise: netPaise },
  });

  return { batchNo, matchedCount: matchedShipments.length };
}
