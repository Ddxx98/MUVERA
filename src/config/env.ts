import { clientEnv } from './env.client';

export const env = {
  ...clientEnv,
  mongoUri: process.env.MONGODB_URI || '',
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'muvera_admin_master_secret_2026',
};

export { clientEnv };
