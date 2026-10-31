import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const muveraApi = createApi({
  reducerPath: 'muveraApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
  }),
  tagTypes: [
    'Product',
    'Category',
    'Order',
    'Inventory',
    'Return',
    'Coupon',
    'Settings',
    'Customer',
  ],
  endpoints: () => ({}),
});
