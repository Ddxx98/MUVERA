export const siteConfig = {
  name: 'MUVERA',
  tagline: 'Midnight Quick-Glam Luxury Streetwear',
  description: 'Ultra-fast 60-minute luxury fashion & streetwear commerce delivered from dark stores.',
  currency: 'INR',
  currencySymbol: '₹',
  navLinks: [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    { label: 'Products', href: '/products' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Account', href: '/account' },
  ],
  categories: [
    { id: 'oversized-tees', name: 'Oversized Tees', slug: 'oversized-tees', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80', count: 18 },
    { id: 'hoodies', name: 'Heavyweight Hoodies', slug: 'hoodies', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80', count: 14 },
    { id: 'cargoes', name: 'Parachutes & Cargoes', slug: 'cargoes', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80', count: 12 },
    { id: 'jackets', name: 'Satin Bombers & Coats', slug: 'jackets', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80', count: 9 },
    { id: 'party-fits', name: 'Club & Party Fits', slug: 'party-fits', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&auto=format&fit=crop&q=80', count: 16 },
    { id: 'footwear', name: 'Footwear & Retro kicks', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', count: 8 },
  ],
  brands: [
    { name: 'MUVERA', slug: 'muvera' },
  ],
  locations: [
    { id: 'loc_blr_ind_01', name: 'Indiranagar Hub', city: 'Bengaluru', expressEtaMinutes: 60, servicePincodes: ['560038', '560008', '560075', '560001', '560025'] },
    { id: 'loc_blr_kor_02', name: 'Koramangala Hub', city: 'Bengaluru', expressEtaMinutes: 60, servicePincodes: ['560034', '560095', '560047', '560030'] },
    { id: 'loc_central_wh', name: 'Central Warehouse', city: 'National Delivery', expressEtaMinutes: 2880, servicePincodes: ['*'] },
  ],
};
