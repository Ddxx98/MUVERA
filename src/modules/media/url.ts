import { clientEnv } from '@/config/env.client';

export interface ImageRef {
  provider: 'cloudinary' | 'unsplash' | 'custom';
  publicId?: string;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'thumb' | 'scale';
  quality?: number | 'auto';
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
}

/**
 * Pure client-safe image URL builder conforming to Section 22.4.
 * Never imports Cloudinary SDK. Safe for server and browser bundles.
 */
export function imageUrl(
  image: ImageRef | string | undefined | null,
  options: ImageTransformOptions = {}
): string {
  if (!image) {
    return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80';
  }

  // Direct URL string
  if (typeof image === 'string') {
    // If it's already an Unsplash URL, apply size optimization
    if (image.includes('unsplash.com') && (options.width || options.height)) {
      const urlObj = new URL(image);
      if (options.width) urlObj.searchParams.set('w', options.width.toString());
      if (options.height) urlObj.searchParams.set('h', options.height.toString());
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      return urlObj.toString();
    }
    return image;
  }

  // Cloudinary image
  if (image.provider === 'cloudinary' && image.publicId) {
    const cloudName = clientEnv.cloudinaryCloudName || 'demo';
    const transforms: string[] = ['f_auto', 'q_auto'];

    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.crop) transforms.push(`c_${options.crop}`);

    const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${image.publicId}`;
  }

  // Explicit URL fallback
  return image.url || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80';
}
