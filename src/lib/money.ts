/**
 * Money calculations in integer paise to avoid IEEE 754 floating point inaccuracies.
 * 1 Rupee = 100 Paise.
 */

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function calculateDiscountPercentage(mrpPaise: number, sellingPricePaise: number): number {
  if (mrpPaise <= 0 || mrpPaise <= sellingPricePaise) return 0;
  return Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100);
}

export function calculateGstBreakdown(sellingPricePaise: number, gstRatePercent: number = 12) {
  // Back-calculate taxable value from GST-inclusive selling price
  const taxableValuePaise = Math.round(sellingPricePaise / (1 + gstRatePercent / 100));
  const gstAmountPaise = sellingPricePaise - taxableValuePaise;
  const halfGst = Math.round(gstAmountPaise / 2);
  return {
    taxableValuePaise,
    gstAmountPaise,
    cgstPaise: halfGst,
    sgstPaise: halfGst,
  };
}
