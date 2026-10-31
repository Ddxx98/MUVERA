import { muveraApi } from './muveraApi';
import { OrderSnapshot } from '@/lib/types';

export const ordersApi = muveraApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<OrderSnapshot[], { customerId?: string } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.customerId) searchParams.set('userId', params.customerId);
        const qs = searchParams.toString();
        return `/orders${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: { orders: OrderSnapshot[] }) => response.orders || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
      keepUnusedDataFor: 60,
    }),

    getOrderById: builder.query<OrderSnapshot, string>({
      query: (id) => `/orders?id=${encodeURIComponent(id)}`,
      transformResponse: (response: { order: OrderSnapshot }) => response.order,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
      keepUnusedDataFor: 60,
    }),

    createOrder: builder.mutation<OrderSnapshot, any>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { order: OrderSnapshot }) => response.order,
      invalidatesTags: [{ type: 'Order', id: 'LIST' }, 'Inventory'],
    }),

    updateOrder: builder.mutation<OrderSnapshot, { orderId: string; [key: string]: any }>({
      query: (body) => ({
        url: '/orders',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: { order: OrderSnapshot }) => response.order,
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
} = ordersApi;
