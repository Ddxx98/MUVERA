import { muveraApi } from './muveraApi';
import { InventoryItem } from '@/lib/types';

export const inventoryApi = muveraApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query<{ inventory: any[]; movements: any[] }, void>({
      query: () => '/inventory',
      providesTags: ['Inventory'],
      keepUnusedDataFor: 30,
    }),

    getInventoryItem: builder.query<InventoryItem, { variantId?: string; sku?: string; locationId?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.variantId) searchParams.set('variantId', params.variantId);
        if (params.sku) searchParams.set('sku', params.sku);
        if (params.locationId) searchParams.set('locationId', params.locationId);
        return `/inventory?${searchParams.toString()}`;
      },
      transformResponse: (response: { item: InventoryItem }) => response.item,
      providesTags: (result, error, { variantId, sku }) => [
        { type: 'Inventory', id: variantId || sku },
      ],
      keepUnusedDataFor: 15,
    }),

    adjustStock: builder.mutation<void, { variantId?: string; sku?: string; locationId?: string; quantityDelta: number; reason: string; actor?: string }>({
      query: (body) => ({
        url: '/inventory',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Inventory', { type: 'Product', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetInventoryItemQuery,
  useAdjustStockMutation,
} = inventoryApi;
