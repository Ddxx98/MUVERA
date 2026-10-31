import { ShipmentStatus } from '@/lib/models/Shipment';

export interface StatusMapping {
  status: ShipmentStatus;
  isNdr?: boolean;
  isRto?: boolean;
  isTerminal?: boolean;
  isInformational?: boolean;
}

export function normalizeStatusLabel(label?: string | null): string {
  return (label || '').trim().toUpperCase().replace(/[_\-]+/g, ' ');
}

export function parseShiprocketDate(dateStr?: string | null): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`Invalid Shiprocket timestamp: "${dateStr}"`);
  }
  const trimmed = dateStr.trim();
  const hasOffset = /([+-]\d{2}:?\d{2}|Z)$/i.test(trimmed);
  const normalized = hasOffset ? trimmed : `${trimmed.replace(' ', 'T')}+05:30`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unparseable Shiprocket timestamp: "${dateStr}"`);
  }
  return parsed;
}

export const FORWARD_STATUS_MAP: Record<string, StatusMapping> = {
  // Processing & Manifest (Rank 1)
  'NEW': { status: 'created' },
  'PROCESSING': { status: 'created' },
  'MANIFEST GENERATED': { status: 'manifested' },
  'MANIFESTED': { status: 'manifested' },
  'AWB ASSIGNED': { status: 'manifested' },
  'READY TO SHIP': { status: 'manifested' },

  // Pickup Phase (Rank 1)
  'PICKUP SCHEDULED': { status: 'manifested' },
  'PICKUP QUEUED': { status: 'manifested' },
  'PICKUP GENERATED': { status: 'manifested' },
  'OUT FOR PICKUP': { status: 'manifested' },
  'PICKUP RESCHEDULED': { status: 'pickup_exception' },
  'PICKUP EXCEPTION': { status: 'pickup_exception' },
  'PICKUP ERROR': { status: 'pickup_exception' },
  'NOT PICKED': { status: 'pickup_exception' },

  // Transit Phase (Rank 2 & 3)
  'PICKED UP': { status: 'picked_up' },
  'SHIPPED': { status: 'picked_up' }, // Carrier transit hub scan after pickup
  'IN TRANSIT': { status: 'in_transit' },
  'REACHED AT DESTINATION HUB': { status: 'in_transit' },
  'DELAYED': { status: 'in_transit', isInformational: true }, // Updates location only
  'OUT FOR DELIVERY': { status: 'out_for_delivery' }, // Rank 4

  // Delivery (Rank 5)
  'DELIVERED': { status: 'delivered', isTerminal: true },

  // NDR (Rank 4)
  'NDR': { status: 'ndr_undelivered', isNdr: true },
  'NDR RAISED': { status: 'ndr_undelivered', isNdr: true },
  'UNDELIVERED': { status: 'ndr_undelivered', isNdr: true },
  'ATTEMPTED': { status: 'ndr_undelivered', isNdr: true },
  'OUT FOR DELIVERY (NDR)': { status: 'out_for_delivery', isNdr: true },

  // RTO Branches
  'RTO INITIATED': { status: 'rto_initiated', isRto: true },
  'RTO IN TRANSIT': { status: 'rto_in_transit', isRto: true },
  'RTO OFD': { status: 'rto_in_transit', isRto: true },
  'RTO DELIVERED': { status: 'rto_delivered', isRto: true, isTerminal: true },
  'RTO ACKNOWLEDGED': { status: 'rto_delivered', isRto: true, isInformational: true },

  // Terminals
  'CANCELED': { status: 'cancelled', isTerminal: true },
  'CANCELLED': { status: 'cancelled', isTerminal: true },
  'LOST': { status: 'lost', isTerminal: true },
  'DAMAGED': { status: 'damaged', isTerminal: true },
  'DESTROYED': { status: 'destroyed', isTerminal: true },
};

export const RETURN_STATUS_MAP: Record<string, StatusMapping> = {
  'RETURN INITIATED': { status: 'created' },
  'RETURN SCHEDULED': { status: 'manifested' },
  'RETURN PICKED UP': { status: 'picked_up' },
  'RETURN IN TRANSIT': { status: 'in_transit' },
  'RETURN OUT FOR DELIVERY': { status: 'out_for_delivery' },
  'RETURN DELIVERED': { status: 'delivered', isTerminal: true },
  'RETURN CANCELLED': { status: 'cancelled', isTerminal: true },
};

export const STATUS_RANKS: Record<string, number> = {
  created: 0,
  manifested: 1,
  pickup_exception: 1, // Same rank as manifested
  picked_up: 2,
  in_transit: 3,
  out_for_delivery: 4,
  ndr_undelivered: 4, // Same rank as out_for_delivery
  delivered: 5,
};

export function getAllowedPredecessors(nextStatus: ShipmentStatus): ShipmentStatus[] {
  const predecessors = new Set<ShipmentStatus>();
  const nextRank = STATUS_RANKS[nextStatus];

  // 1. Happy-path rank comparison: all lower ranks are valid predecessors
  if (nextRank !== undefined) {
    for (const [status, rank] of Object.entries(STATUS_RANKS)) {
      if (rank < nextRank) {
        predecessors.add(status as ShipmentStatus);
      }
    }
  }

  // 2. Explicit rules for same-rank swaps, re-transits, and branches
  switch (nextStatus) {
    case 'manifested':
      predecessors.add('pickup_exception');
      break;
    case 'pickup_exception':
      predecessors.add('manifested');
      break;
    case 'out_for_delivery':
      predecessors.add('ndr_undelivered');
      break;
    case 'ndr_undelivered':
      predecessors.add('out_for_delivery');
      break;
    case 'in_transit':
      // Carrier re-transit scan between reattempts
      predecessors.add('out_for_delivery');
      predecessors.add('ndr_undelivered');
      break;
    case 'rto_initiated':
    case 'rto_in_transit':
    case 'rto_delivered':
      // RTO can occur from ANY active state (missed scan safe)
      predecessors.add('manifested');
      predecessors.add('pickup_exception');
      predecessors.add('picked_up');
      predecessors.add('in_transit');
      predecessors.add('out_for_delivery');
      predecessors.add('ndr_undelivered');
      if (nextStatus === 'rto_in_transit') predecessors.add('rto_initiated');
      if (nextStatus === 'rto_delivered') {
        predecessors.add('rto_initiated');
        predecessors.add('rto_in_transit');
      }
      break;
    case 'lost':
    case 'damaged':
      predecessors.add('manifested');
      predecessors.add('pickup_exception');
      predecessors.add('picked_up');
      predecessors.add('in_transit');
      predecessors.add('out_for_delivery');
      predecessors.add('ndr_undelivered');
      predecessors.add('rto_initiated');
      predecessors.add('rto_in_transit');
      break;
    case 'cancelled':
      predecessors.add('created');
      predecessors.add('manifested');
      predecessors.add('pickup_exception');
      break;
    case 'destroyed':
      predecessors.add('rto_delivered');
      predecessors.add('rto_in_transit');
      predecessors.add('rto_initiated');
      predecessors.add('ndr_undelivered');
      break;
  }

  return Array.from(predecessors);
}
