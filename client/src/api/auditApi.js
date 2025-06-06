import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://dubai-pos-backend.onrender.com/api/v1/audit', credentials: 'include' }),
  tagTypes: ['Audit'],
  endpoints: (builder) => ({
    getAuditLogs: builder.query({
      query: ({ page = 1, limit = 10, actorId, actorModel, action, collectionName, documentId, from, to }) => ({
        url: '/',
        params: {
          page,
          limit,
          actorId,
          actorModel,
          action,
          collectionName,
          documentId,
          from,
          to
        }
      }),
      providesTags: ['Audit']
    }),
    getAuditLogById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Audit', id }]
    })
  })
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogByIdQuery
} = auditApi; 