export interface BoxClass {
  name: 'light' | 'medium' | 'heavy' | 'multi';
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  tareWeightKg: number;
  maxEffectiveVolumeCm3: number;
}

export const BOX_CLASSES: BoxClass[] = [
  {
    name: 'light',
    lengthCm: 25,
    breadthCm: 20,
    heightCm: 3,
    tareWeightKg: 0.05,
    maxEffectiveVolumeCm3: 25 * 20 * 3 * 0.75, // 1125 cm³
  },
  {
    name: 'medium',
    lengthCm: 30,
    breadthCm: 25,
    heightCm: 7,
    tareWeightKg: 0.1,
    maxEffectiveVolumeCm3: 30 * 25 * 7 * 0.75, // 3937.5 cm³
  },
  {
    name: 'heavy',
    lengthCm: 38,
    breadthCm: 30,
    heightCm: 10,
    tareWeightKg: 0.15,
    maxEffectiveVolumeCm3: 38 * 30 * 10 * 0.75, // 8550 cm³
  },
  {
    name: 'multi',
    lengthCm: 42,
    breadthCm: 35,
    heightCm: 15,
    tareWeightKg: 0.2,
    maxEffectiveVolumeCm3: 42 * 35 * 15 * 0.75, // 16537.5 cm³
  },
];

export interface ItemPackagingInfo {
  variantId: string;
  quantity: number;
  unitWeightKg: number;
  unitLengthCm: number;
  unitBreadthCm: number;
  unitHeightCm: number;
}

export interface ParcelPlan {
  box: BoxClass;
  items: Array<{ variantId: string; quantity: number }>;
  deadWeightKg: number;
  volumetricWeightKg: number;
}

/**
 * Selects optimal packaging box for a set of items, applying a 0.75 fill factor.
 * If total volume exceeds Multi box, partitions items across multiple boxes.
 */
export function planOrderPackaging(items: ItemPackagingInfo[]): ParcelPlan[] {
  if (!items || items.length === 0) {
    const defaultBox = BOX_CLASSES[0];
    return [
      {
        box: defaultBox,
        items: [],
        deadWeightKg: 0.5 + defaultBox.tareWeightKg,
        volumetricWeightKg: (defaultBox.lengthCm * defaultBox.breadthCm * defaultBox.heightCm) / 5000,
      },
    ];
  }

  // Calculate total item volume and dead weight
  let totalVolume = 0;
  let totalDeadWeight = 0;

  for (const item of items) {
    const itemVol = item.unitLengthCm * item.unitBreadthCm * item.unitHeightCm;
    totalVolume += itemVol * item.quantity;
    totalDeadWeight += item.unitWeightKg * item.quantity;
  }

  const multiBox = BOX_CLASSES[3];

  // If order fits within single Multi box
  if (totalVolume <= multiBox.maxEffectiveVolumeCm3) {
    const chosenBox = BOX_CLASSES.find((b) => totalVolume <= b.maxEffectiveVolumeCm3) || multiBox;
    const finalDeadWeight = Math.round((totalDeadWeight + chosenBox.tareWeightKg) * 100) / 100;
    const volumetricWeight = (chosenBox.lengthCm * chosenBox.breadthCm * chosenBox.heightCm) / 5000;

    return [
      {
        box: chosenBox,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        deadWeightKg: finalDeadWeight,
        volumetricWeightKg: volumetricWeight,
      },
    ];
  }

  // Multi-box partitioning: split across multiple Multi boxes
  const parcels: ParcelPlan[] = [];
  let currentItems: Array<{ variantId: string; quantity: number }> = [];
  let currentVol = 0;
  let currentDeadWeight = 0;

  for (const item of items) {
    for (let q = 0; q < item.quantity; q++) {
      const unitVol = item.unitLengthCm * item.unitBreadthCm * item.unitHeightCm;
      if (currentVol + unitVol > multiBox.maxEffectiveVolumeCm3 && currentItems.length > 0) {
        parcels.push({
          box: multiBox,
          items: currentItems,
          deadWeightKg: Math.round((currentDeadWeight + multiBox.tareWeightKg) * 100) / 100,
          volumetricWeightKg: (multiBox.lengthCm * multiBox.breadthCm * multiBox.heightCm) / 5000,
        });
        currentItems = [];
        currentVol = 0;
        currentDeadWeight = 0;
      }

      const existing = currentItems.find((ci) => ci.variantId === item.variantId);
      if (existing) {
        existing.quantity += 1;
      } else {
        currentItems.push({ variantId: item.variantId, quantity: 1 });
      }
      currentVol += unitVol;
      currentDeadWeight += item.unitWeightKg;
    }
  }

  if (currentItems.length > 0) {
    const chosenBox = BOX_CLASSES.find((b) => currentVol <= b.maxEffectiveVolumeCm3) || multiBox;
    parcels.push({
      box: chosenBox,
      items: currentItems,
      deadWeightKg: Math.round((currentDeadWeight + chosenBox.tareWeightKg) * 100) / 100,
      volumetricWeightKg: (chosenBox.lengthCm * chosenBox.breadthCm * chosenBox.heightCm) / 5000,
    });
  }

  return parcels;
}

/**
 * Splits an address at word boundaries, ensuring each line does not exceed maxLength.
 */
export function sanitizeAddressLines(address: string, maxLength = 40): { line1: string; line2?: string } {
  const words = (address || '').trim().replace(/\s+/g, ' ').split(' ');
  let line1 = '';
  let line2 = '';

  for (const word of words) {
    if (!line2 && (line1 + ' ' + word).trim().length <= maxLength) {
      line1 = (line1 + ' ' + word).trim();
    } else {
      line2 = (line2 + ' ' + word).trim();
    }
  }

  return {
    line1: line1 || 'Address line 1',
    ...(line2 ? { line2: line2.slice(0, maxLength) } : {}),
  };
}
