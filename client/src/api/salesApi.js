import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const salesApi = createApi({
  reducerPath: 'salesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1', credentials: 'include' }),
  tagTypes: ['Invoice', 'Sale'],
  endpoints: (builder) => ({
    createInvoice: builder.mutation({
      query: (invoiceData) => ({
        url: '/invoices',
        method: 'POST',
        body: invoiceData,
      }),
      invalidatesTags: ['Invoice'],
    }),

    getAllInvoices: builder.query({
      query: ({ page = 1, limit = 10, status, customerName, salesmanId, from, to }) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (status && status !== 'all') params.append('status', status);
        if (customerName) params.append('customerName', customerName);
        if (salesmanId) params.append('salesmanName', salesmanId);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        
        return {
          url: '/invoices',
          params,
        };
      },
      transformResponse: (response) => ({
        invoices: response.invoices.map(invoice => ({
          ...invoice,
          salesmanName: invoice.salesman?.name || 'Unknown'
        })),
        pagination: response.pagination,
      }),
      providesTags: ['Invoice'],
    }),

    getInvoiceById: builder.query({
      query: (id) => `/invoices/${id}`,
      transformResponse: (response) => response.invoice,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    updateInvoice: builder.mutation({
      query: ({ id, ...updateData }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
      ],
    }),

    deleteInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invoice'],
    }),

    addPayment: builder.mutation({
      query: ({ id, ...paymentData }) => ({
        url: `/invoices/${id}/payments`,
        method: 'POST',
        body: paymentData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Invoice', id },
        'Invoice',
      ],
    }),

    reversePayment: builder.mutation({
      query: ({ invoiceId, paymentId, reason }) => ({
        url: `/invoices/${invoiceId}/payments/${paymentId}/reverse`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { invoiceId }) => [
        { type: 'Invoice', id: invoiceId },
        'Invoice',
      ],
    }),

    recordAdvance: builder.mutation({
      query: (advanceData) => ({
        url: '/advances',
        method: 'POST',
        body: advanceData,
      }),
      invalidatesTags: (result, error, { invoiceId }) => [
        { type: 'Invoice', id: invoiceId },
        'Invoice',
      ],
    }),
  }),
});

export const {
  useCreateInvoiceMutation,
  useGetAllInvoicesQuery,
  useGetInvoiceByIdQuery,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useAddPaymentMutation,
  useReversePaymentMutation,
  useRecordAdvanceMutation,
} = salesApi; 