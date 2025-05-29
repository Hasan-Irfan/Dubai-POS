import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const cashApi = createApi({
  reducerPath: 'cashApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1', credentials: 'include' }),
  tagTypes: ['CashEntry'],
  endpoints: (builder) => ({
    getAllCashEntries: builder.query({
      query: ({ page = 1, limit = 10, type, from, to, includeDeleted = false }) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (type) params.append('type', type);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (includeDeleted) params.append('includeDeleted', includeDeleted);
        
        return {
          url: '/cash',
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.entries.map(({ _id }) => ({ type: 'CashEntry', id: _id })),
              { type: 'CashEntry', id: 'LIST' },
            ]
          : [{ type: 'CashEntry', id: 'LIST' }],
    }),

    getCashEntryById: builder.query({
      query: (id) => `/cash/${id}`,
      providesTags: (result, error, id) => [{ type: 'CashEntry', id }],
    }),

    addCashEntry: builder.mutation({
      query: (entry) => ({
        url: '/cash',
        method: 'POST',
        body: entry,
      }),
      invalidatesTags: [{ type: 'CashEntry', id: 'LIST' }],
    }),

    updateCashEntry: builder.mutation({
      query: ({ id, ...entry }) => ({
        url: `/cash/${id}`,
        method: 'PUT',
        body: entry,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CashEntry', id },
        { type: 'CashEntry', id: 'LIST' },
      ],
    }),

    deleteCashEntry: builder.mutation({
      query: (id) => ({
        url: `/cash/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'CashEntry', id },
        { type: 'CashEntry', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAllCashEntriesQuery,
  useGetCashEntryByIdQuery,
  useAddCashEntryMutation,
  useUpdateCashEntryMutation,
  useDeleteCashEntryMutation,
} = cashApi; 