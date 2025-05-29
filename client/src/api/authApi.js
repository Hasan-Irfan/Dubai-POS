import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({ 
  baseUrl: 'http://localhost:5000/api/v1', 
  credentials: 'include',
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh the token
    const refreshResult = await baseQuery(
      { url: '/refresh', method: 'POST' },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      // Retry the original request
      result = await baseQuery(args, api, extraOptions);
    } else {
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("userID");
      window.location.href = '/login';
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: ({ username, email, password }) => ({
        url: '/signup', 
        method: 'POST',
        body: { username, email, password }, 
      }),
    }),

    login: builder.mutation({
      query: ({ email, password }) => ({
        url: '/login',
        method: 'POST',
        body: { email, password },
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: '/logout', 
        method: 'POST',
      }),
    }),

    resetPassword: builder.mutation({
      query: ({ email }) => ({
        url: '/reset-password', 
        method: 'POST',
        body: { email }, 
      }),
    }),

    updatePassword: builder.mutation({
      query: ({ resetToken, password }) => ({
        url: `/update-password/${resetToken}`,  
        method: 'POST',
        body: { password },  
      }),
    }),

    changePassword: builder.mutation({
      query: (password) => ({
        url: '/change-password',
        method: 'POST',
        body: { password },
      }),
    }),

    jwtVerify: builder.query({
      query: () => ({
        url: '/verify', 
        method: 'POST',
      }),
    }),

    refresh: builder.mutation({
      query: () => ({
        url: '/refresh',
        method: 'POST',
      }),
    }),
  }),
});

export const { 
  useSignupMutation, 
  useLoginMutation, 
  useLogoutMutation, 
  useResetPasswordMutation,
  useUpdatePasswordMutation,
  useChangePasswordMutation,
  useJwtVerifyQuery,
  useRefreshMutation,
} = authApi;
