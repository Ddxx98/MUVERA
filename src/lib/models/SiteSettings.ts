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
  checkoutV2Enabled?: boolean;
  prepaidEnabled?: boolean;
  courierSelectionStrategy?: 'cheapest' | 'fastest' | 'best_rated';
  // Hero Section CMS
  heroActive?: boolean;
  heroBackgroundImage?: string;
  heroTagBadge?: string;
  heroSecondaryBadge?: string;
  heroEyebrow?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroCtaLink?: string;
  heroDeliveryTicker?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SiteSettingsDocument extends Document, SiteSettingsData {}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    businessName: { type: String, default: 'MUVERA Luxury Streetwear' },
    tagline: { type: String, default: 'Luxury Fashion & Streetwear Commerce' },
    supportEmail: { type: String, default: 'support@muvera.club' },
    supportPhone: { type: String, default: '+91 93809 33170' },
    whatsappNumber: { type: String, default: '919380933170' },
    freeShippingThresholdPaise: { type: Number, default: 99900 },
    expressDeliveryFeePaise: { type: Number, default: 9900 },
    holdExpiryMinutes: { type: Number, default: 15 },
    returnWindowDays: { type: Number, default: 7 },
    defaultLocationName: { type: String, default: 'Indiranagar Dark Store Hub (Bengaluru)' },
    defaultLocationPincode: { type: String, default: '560038' },
    businessUpiId: { type: String, default: 'muvera.store@upi' },
    businessUpiMerchantName: { type: String, default: 'MUVERA Luxury Streetwear' },
    topAnnouncementText: {
      type: String,
      default: '⚡ FAST DISPATCH • Free Express Shipping above ₹999',
    },
    topAnnouncementActive: { type: Boolean, default: true },
    blitzDropHeadline: { type: String, default: 'MIDNIGHT QUICK-GLAM BLITZ DROPS' },
    blitzDropSubheadline: {
      type: String,
      default: 'Curated high-street statement pieces ready for express dispatch.',
    },
    defaultTheme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    upiEnabled: { type: Boolean, default: true },
    codEnabled: { type: Boolean, default: true },
    razorpayEnabled: { type: Boolean, default: false },
    checkoutV2Enabled: { type: Boolean, default: false },
    prepaidEnabled: { type: Boolean, default: false },
    courierSelectionStrategy: { type: String, enum: ['cheapest', 'fastest', 'best_rated'], default: 'cheapest' },
    // Hero Section CMS
    heroActive: { type: Boolean, default: true },
    heroBackgroundImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80',
    },
    heroTagBadge: { type: String, default: 'Blitz Drop 04' },
    heroSecondaryBadge: { type: String, default: 'Try & Buy Available' },
    heroEyebrow: { type: String, default: 'Instant Nightlife Glamour' },
    heroTitleLine1: { type: String, default: 'PARTY TONIGHT?' },
    heroTitleLine2: { type: String, default: 'EXPRESS STREETWEAR' },
    heroSubtitle: {
      type: String,
      default:
        'Curated luxury streetwear, statement drops & limited club editions delivered with express speed.',
    },
    heroCtaText: { type: String, default: 'Explore Drops' },
    heroCtaLink: { type: String, default: '/products' },
    heroDeliveryTicker: { type: String, default: 'Dispatches today' },
    updatedBy: { type: String, default: 'System' },
  },
  { timestamps: true }
);

export const SiteSettingsModel: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings || mongoose.model<SiteSettingsDocument>('SiteSettings', SiteSettingsSchema);
