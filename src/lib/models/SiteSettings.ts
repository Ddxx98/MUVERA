import mongoose, { Schema, Document, Model } from 'mongoose';

export interface SiteSettingsData {
  businessName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  freeShippingThresholdPaise: number;
  expressDeliveryFeePaise: number;
  holdExpiryMinutes: number;
  returnWindowDays: number;
  defaultLocationName: string;
  defaultLocationPincode: string;
  businessUpiId: string;
  businessUpiMerchantName: string;
  topAnnouncementText: string;
  topAnnouncementActive: boolean;
  blitzDropHeadline: string;
  blitzDropSubheadline: string;
  defaultTheme: 'dark' | 'light' | 'system';
  upiEnabled: boolean;
  codEnabled: boolean;
  razorpayEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SiteSettingsDocument extends Document, SiteSettingsData {}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    businessName: { type: String, default: 'MUVERA Luxury Streetwear' },
    tagline: { type: String, default: '60-Minute Luxury Fashion & Streetwear Commerce' },
    supportEmail: { type: String, default: 'support@muvera.club' },
    supportPhone: { type: String, default: '+91 93809 33170' },
    whatsappNumber: { type: String, default: '919380933170' },
    freeShippingThresholdPaise: { type: Number, default: 99900 },
    expressDeliveryFeePaise: { type: Number, default: 9900 },
    holdExpiryMinutes: { type: Number, default: 15 },
    returnWindowDays: { type: Number, default: 7 },
    defaultLocationName: { type: String, default: 'Indiranagar Quick-Glam Dark Store Hub (Bengaluru)' },
    defaultLocationPincode: { type: String, default: '560038' },
    businessUpiId: { type: String, default: 'muvera.store@upi' },
    businessUpiMerchantName: { type: String, default: 'MUVERA Luxury Streetwear' },
    topAnnouncementText: {
      type: String,
      default: '⚡ EXPRESS 60-MINUTES • Dark Stores in Bengaluru • Free Express Shipping above ₹999',
    },
    topAnnouncementActive: { type: Boolean, default: true },
    blitzDropHeadline: { type: String, default: 'MIDNIGHT QUICK-GLAM BLITZ DROPS' },
    blitzDropSubheadline: {
      type: String,
      default: 'Curated high-street statement pieces ready for dispatch in 60 minutes.',
    },
    defaultTheme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    upiEnabled: { type: Boolean, default: true },
    codEnabled: { type: Boolean, default: true },
    razorpayEnabled: { type: Boolean, default: false },
    updatedBy: { type: String, default: 'System' },
  },
  { timestamps: true }
);

export const SiteSettingsModel: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings || mongoose.model<SiteSettingsDocument>('SiteSettings', SiteSettingsSchema);
