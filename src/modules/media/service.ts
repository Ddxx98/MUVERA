import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';
import { clientEnv } from '@/config/env.client';

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

export const mediaService = {
  /**
   * Generates a secure upload signature for direct browser -> Cloudinary uploads.
   * Keeps API Secret on the server.
   */
  generateUploadSignature(folder = 'muvera/products'): UploadSignature {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = serverEnv.CLOUDINARY_API_SECRET;
    const apiKey = serverEnv.CLOUDINARY_API_KEY;

    if (!apiSecret || !apiKey) {
      // Return mock payload for dev when Cloudinary is not yet configured
      return {
        signature: 'dev_mock_signature',
        timestamp,
        cloudName: clientEnv.cloudinaryCloudName,
        apiKey: apiKey || 'dev_mock_key',
        folder,
      };
    }

    const strToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(strToSign).digest('hex');

    return {
      signature,
      timestamp,
      cloudName: clientEnv.cloudinaryCloudName,
      apiKey,
      folder,
    };
  },
};
