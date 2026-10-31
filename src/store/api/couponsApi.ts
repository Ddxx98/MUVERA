import { muveraApi } from './muveraApi';
import { Coupon } from '@/lib/types';

export const couponsApi = muveraApi.injectEndpoints({
  endpoints: (builder) => ({
    validateCoupon: builder.query<{ valid: boolean; coupon?: Coupon; message?: string }, string>({
      query: (code) => `/coupons?code=${encodeURIComponent(code)}`,
      providesTags: (result, error, code) => [{ type: 'Coupon', id: code.toUpperCase() }],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useValidateCouponQuery,
  useLazyValidateCouponQuery,
} = couponsApi;
