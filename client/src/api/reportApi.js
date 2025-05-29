import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const reportApi = createApi({
  reducerPath: 'reportApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1/reports', credentials: 'include' }),
  tagTypes: ['Report'],
  endpoints: (builder) => ({
    getMonthlySummary: builder.query({
      query: ({ from, to }) => ({
        url: '/monthly',
        params: { from, to }
      }),
      transformResponse: (response) => ({
        summary: response.summary,
        totals: response.totals
      }),
      providesTags: ['Report']
    }),
  }),
});

export const {
  useGetMonthlySummaryQuery,
} = reportApi; 