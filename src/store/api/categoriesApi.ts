import { muveraApi } from './muveraApi';
import { Category } from '@/lib/types';

export const categoriesApi = muveraApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      transformResponse: (response: { categories: Category[] }) => response.categories || [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
      keepUnusedDataFor: 1800, // 30 minutes in-memory cache
    }),

    getCategoryById: builder.query<Category, string>({
      query: (id) => `/categories?id=${encodeURIComponent(id)}`,
      transformResponse: (response: { category: Category }) => response.category,
      providesTags: (result, error, id) => [{ type: 'Category', id }],
      keepUnusedDataFor: 1800,
    }),

    getCategoryBySlug: builder.query<Category, string>({
      query: (slug) => `/categories?slug=${encodeURIComponent(slug)}`,
      transformResponse: (response: { category: Category }) => response.category,
      providesTags: (result, error, slug) => [{ type: 'Category', id: slug }],
      keepUnusedDataFor: 1800,
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useGetCategoryBySlugQuery,
} = categoriesApi;
