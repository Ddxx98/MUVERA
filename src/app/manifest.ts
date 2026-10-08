import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MUVERA | Luxury Streetwear & Nocturne Clubwear',
    short_name: 'MUVERA',
    description: 'Luxury fashion, oversized tees, satin bombers, and midnight statement fits delivered with express courier speed.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#F4CE76',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}
