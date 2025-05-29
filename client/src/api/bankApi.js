import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const bankApi = createApi({
  reducerPath: 'bankApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1', credentials: 'include' }),
  tagTypes: ['BankTransaction'],
  endpoints: (builder) => ({
    getAllBankTransactions: builder.query({
      query: ({ page = 1, limit = 10, account, method, from, to, includeDeleted = false }) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (account) params.append('account', account);
        if (method) params.append('method', method);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (includeDeleted) params.append('includeDeleted', includeDeleted);
        
        return {
          url: '/bank',
          params,
        };
      },
      providesTags: (result) => 
        result
          ? [
              ...result.transactions.map(({ _id }) => ({ type: 'BankTransaction', id: _id })),
              { type: 'BankTransaction', id: 'LIST' },
            ]
          : [{ type: 'BankTransaction', id: 'LIST' }],
    }),

    getBankTransactionById: builder.query({
      query: (id) => `/bank/${id}`,
      providesTags: (result, error, id) => [{ type: 'BankTransaction', id }],
    }),

    addBankTransaction: builder.mutation({
      query: (transaction) => ({
        url: '/bank',
        method: 'POST',
        body: transaction,
      }),
      invalidatesTags: [{ type: 'BankTransaction', id: 'LIST' }],
    }),

    updateBankTransaction: builder.mutation({
      query: ({ id, ...transaction }) => ({
        url: `/bank/${id}`,
        method: 'PUT',
        body: transaction,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'BankTransaction', id },
        { type: 'BankTransaction', id: 'LIST' },
      ],
    }),

    deleteBankTransaction: builder.mutation({
      query: (id) => ({
        url: `/bank/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'BankTransaction', id },
        { type: 'BankTransaction', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAllBankTransactionsQuery,
  useGetBankTransactionByIdQuery,
  useAddBankTransactionMutation,
  useUpdateBankTransactionMutation,
  useDeleteBankTransactionMutation,
} = bankApi; 