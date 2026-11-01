import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().optional().default(''),
  ADMIN_SECRET_KEY: z.string().default('muvera_admin_master_secret_2026'),
  /** Separate JWT signing secret for customer sessions (aud=customer) */
  SESSION_SECRET: z.string().default('muvera_customer_session_secret_2026'),
  /** Separate JWT signing secret for admin sessions (aud=admin) */
  ADMIN_SESSION_SECRET: z.string().default('muvera_admin_session_jwt_secret_2026'),
  RAZORPAY_MODE: z.enum(['test', 'live']).default('test'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  OTP_SECRET: z.string().min(32).default('muvera_otp_secret_key_32chars_2026'),
  COD_MAX_ORDER_VALUE_PAISE: z.coerce.number().int().positive().default(500000),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CRON_SECRET: z.string().default('muvera_cron_secret_internal_2026'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  EMAIL_PROVIDER: z.enum(['brevo', 'console', 'emailjs']).default('console'),
  BREVO_API_KEY: z.string().optional().default(''),
  EMAILJS_SERVICE_ID: z.string().optional().default(''),
  EMAILJS_TEMPLATE_ID: z.string().optional().default(''),
  EMAILJS_PUBLIC_KEY: z.string().optional().default(''),
  EMAILJS_PRIVATE_KEY: z.string().optional().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('security@muvera.club'),
  EMAIL_FROM_NAME: z.string().default('MUVERA Security'),
  SITE_URL: z.string().default('http://localhost:3000'),

  // Logistics & Shiprocket Config
  SHIPPING_PROVIDER: z.enum(['manual', 'mock', 'shiprocket']).default('mock'),
  SHIPROCKET_EMAIL: z.string().optional().default(''),
  SHIPROCKET_PASSWORD: z.string().optional().default(''),
  SHIPROCKET_PICKUP_LOCATION: z.string().default('MAIN_WAREHOUSE'),
  LOGISTICS_WEBHOOK_SECRET: z.string().min(32).default('muvera_logistics_webhook_secret_32chars_2026'),
  SHIPROCKET_MIN_WALLET_BALANCE_PAISE: z.coerce.number().default(100000),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).default('muvera_token_encryption_key_32bytes_2026'),
  SHIPROCKET_ENABLE_COD: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid server environment variables:', parsed.error.format());
}

if (process.env.NODE_ENV === 'production') {
  if (process.env.RAZORPAY_MODE === 'live') {
    if (!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')) {
      throw new Error('[ENV] RAZORPAY_KEY_ID must start with rzp_live_ in production live mode');
    }
    if (!process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('[ENV] RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are required when RAZORPAY_MODE=live in production');
    }
  }
  if (process.env.SHIPPING_PROVIDER === 'shiprocket') {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      throw new Error('[ENV] SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD are required when SHIPPING_PROVIDER=shiprocket');
    }
  }
}

export const serverEnv = parsed.success ? parsed.data : {
  MONGODB_URI: process.env.MONGODB_URI || '',
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'muvera_admin_master_secret_2026',
  SESSION_SECRET: process.env.SESSION_SECRET || 'muvera_customer_session_secret_2026',
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || 'muvera_admin_session_jwt_secret_2026',
  RAZORPAY_MODE: (process.env.RAZORPAY_MODE as any) || 'test',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  OTP_SECRET: process.env.OTP_SECRET || 'muvera_otp_secret_key_32chars_2026',
  COD_MAX_ORDER_VALUE_PAISE: Number(process.env.COD_MAX_ORDER_VALUE_PAISE) || 500000,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CRON_SECRET: process.env.CRON_SECRET || 'muvera_cron_secret_internal_2026',
  NODE_ENV: (process.env.NODE_ENV as any) || 'development',
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER as any) || 'console',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || '',
  EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || '',
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || '',
  EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'security@muvera.club',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'MUVERA Security',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000',
  SHIPPING_PROVIDER: (process.env.SHIPPING_PROVIDER as any) || 'mock',
  SHIPROCKET_EMAIL: process.env.SHIPROCKET_EMAIL || '',
  SHIPROCKET_PASSWORD: process.env.SHIPROCKET_PASSWORD || '',
  SHIPROCKET_PICKUP_LOCATION: process.env.SHIPROCKET_PICKUP_LOCATION || 'MAIN_WAREHOUSE',
  LOGISTICS_WEBHOOK_SECRET: process.env.LOGISTICS_WEBHOOK_SECRET || 'muvera_logistics_webhook_secret_32chars_2026',
  SHIPROCKET_MIN_WALLET_BALANCE_PAISE: Number(process.env.SHIPROCKET_MIN_WALLET_BALANCE_PAISE) || 100000,
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY || 'muvera_token_encryption_key_32bytes_2026',
  SHIPROCKET_ENABLE_COD: process.env.SHIPROCKET_ENABLE_COD !== 'false',
};
