import { muveraApi } from './muveraApi';
import { Product } from '@/lib/types';

export interface ProductsQueryParams {
  categoryId?: string;
  category?: string;
  brand?: string;
  search?: string;
  isBlitzDrop?: boolean;
  isDealOfTheHour?: boolean;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  skip?: number;
}

export const productsApi = muveraApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], ProductsQueryParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.categoryId) searchParams.set('categoryId', params.categoryId);
          if (params.category) searchParams.set('category', params.category);
          if (params.brand) searchParams.set('brand', params.brand);
          if (params.search) searchParams.set('search', params.search);
          if (params.isBlitzDrop !== undefined) searchParams.set('isBlitzDrop', String(params.isBlitzDrop));
          if (params.isDealOfTheHour !== undefined) searchParams.set('isDealOfTheHour', String(params.isDealOfTheHour));
          if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
          if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
          if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
          if (params.skip !== undefined) searchParams.set('skip', String(params.skip));
        }
        const qs = searchParams.toString();
        return `/products${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (response: { products: Product[] }) => response.products || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
      keepUnusedDataFor: 300, // 5 minutes in-memory cache
    }),

    getProductById: builder.query<Product, string>({
      query: (id) => `/products?id=${encodeURIComponent(id)}`,
      transformResponse: (response: { product: Product }) => response.product,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
      keepUnusedDataFor: 300,
    }),

    getProductBySlug: builder.query<Product, string>({
      query: (slug) => `/products?slug=${encodeURIComponent(slug)}`,
      transformResponse: (response: { product: Product }) => response.product,
      providesTags: (result, error, slug) => [{ type: 'Product', id: slug }],
      keepUnusedDataFor: 300,
    }),

    upsertProduct: builder.mutation<Product, Partial<Product>>({
      query: (product) => ({
        url: '/products',
        method: 'POST',
        body: product,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductBySlugQuery,
  useUpsertProductMutation,
} = productsApi;
