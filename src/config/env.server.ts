import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().optional().default(''),
  ADMIN_SECRET_KEY: z.string().default('muvera_admin_master_secret_2026'),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
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
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid server environment variables:', parsed.error.format());
}

export const serverEnv = parsed.success ? parsed.data : {
  MONGODB_URI: process.env.MONGODB_URI || '',
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'muvera_admin_master_secret_2026',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
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
};
