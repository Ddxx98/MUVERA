export const clientEnv = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919380933170',
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME || 'MUVERA Luxury Streetwear',
  businessUpiId: process.env.NEXT_PUBLIC_BUSINESS_UPI_ID || 'muvera.store@upi',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@muvera.club',
  defaultLocation: process.env.NEXT_PUBLIC_DEFAULT_LOCATION || 'Indiranagar Dark Store (Bengaluru)',
  freeShippingThresholdPaise: Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_PAISE) || 99900,
  expressDeliveryFeePaise: Number(process.env.NEXT_PUBLIC_EXPRESS_DELIVERY_FEE_PAISE) || 9900,
  holdExpiryMinutes: Number(process.env.NEXT_PUBLIC_HOLD_EXPIRY_MINUTES) || 15,
  cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo',
};
