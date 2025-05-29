import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const vendorApi = createApi({
  reducerPath: 'vendorApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1', credentials: 'include' }),
  tagTypes: ['Vendor', 'VendorTransaction'],
  endpoints: (builder) => ({
    createVendor: builder.mutation({
      query: (vendorData) => ({
        url: '/vendors',
        method: 'POST',
        body: vendorData,
      }),
      invalidatesTags: ['Vendor'],
    }),
    getAllVendors: builder.query({
      query: ({ page = 1, limit = 10, search = '' }) => ({
        url: '/vendors',
        params: { page, limit, search },
      }),
      transformResponse: (response) => ({
        vendors: response.vendors,
        pagination: response.pagination,
      }),
      providesTags: ['Vendor'],
    }),
    getVendorById: builder.query({
      query: (id) => ({
        url: `/vendors/${id}`,
      }),
      transformResponse: (response) => response.vendor,
      providesTags: (result, error, id) => [{ type: 'Vendor', id }],
    }),
    updateVendor: builder.mutation({
      query: ({ id, ...updateData }) => ({
        url: `/vendors/${id}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Vendor', id }],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({
        url: `/vendors/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Vendor', id }, { type: 'Vendor' }],
    }),
    // Vendor Transaction Endpoints
    getVendorTransactions: builder.query({
      query: ({ vendorId, page = 1, limit = 10, from, to }) => ({
        url: '/vendor-transactions',
        params: { vendorId, page, limit, from, to },
      }),
      transformResponse: (response) => ({
        transactions: response.transactions,
        pagination: response.pagination,
      }),
      providesTags: (result, error, { vendorId }) => [{ type: 'VendorTransaction', id: vendorId }],
    }),
    addVendorTransaction: builder.mutation({
      query: (transactionData) => ({
        url: '/vendor-transactions',
        method: 'POST',
        body: transactionData,
      }),
      invalidatesTags: (result, error, { vendorId }) => [{ type: 'VendorTransaction', id: vendorId }],
    }),
    updateVendorTransaction: builder.mutation({
      query: ({ id, ...updateData }) => ({
        url: `/vendor-transactions/${id}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id, vendorId }) => [
        { type: 'VendorTransaction', id },
        { type: 'VendorTransaction', id: vendorId }
      ],
    }),
    deleteVendorTransaction: builder.mutation({
      query: ({ id }) => ({
        url: `/vendor-transactions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id, vendorId }) => [
        { type: 'VendorTransaction', id },
        { type: 'VendorTransaction', id: vendorId }
      ],
    }),
  }),
});

export const {
  useCreateVendorMutation,
  useGetAllVendorsQuery,
  useGetVendorByIdQuery,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetVendorTransactionsQuery,
  useAddVendorTransactionMutation,
  useUpdateVendorTransactionMutation,
  useDeleteVendorTransactionMutation,
} = vendorApi;
