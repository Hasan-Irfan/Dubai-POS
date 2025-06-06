import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'https://dubai-pos-backend.onrender.com/api',
    credentials: 'include'
  }),
  endpoints: (builder) => ({
    getAllMetrics: builder.query({
      query: () => '/dashboard/metrics'
    }),
    getMetricsForDateRange: builder.query({
      query: ({ startDate, endDate }) => ({
        url: '/dashboard/metrics/range',
        params: { startDate, endDate }
      })
    })
  })
});

export const {
  useGetAllMetricsQuery,
  useGetMetricsForDateRangeQuery
} = dashboardApi; 