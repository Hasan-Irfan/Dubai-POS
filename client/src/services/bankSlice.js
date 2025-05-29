import { createSlice } from '@reduxjs/toolkit';
import { bankApi } from '@/api/bankApi';

const initialState = {
  transactions: [],
  currentTransaction: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    account: '',
    method: 'all',
    dateRange: {
      from: '',
      to: '',
    },
  },
  loading: false,
  error: null,
};

export const bankSlice = createSlice({
  name: 'bank',
  initialState,
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    setPagination: (state, action) => {
      state.pagination = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setDateRange: (state, action) => {
      state.filters.dateRange = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination = initialState.pagination;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        bankApi.endpoints.getAllBankTransactions.matchPending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        bankApi.endpoints.getAllBankTransactions.matchFulfilled,
        (state, action) => {
          state.loading = false;
          state.transactions = action.payload.transactions;
          state.pagination = action.payload.pagination;
          state.error = null;
        }
      )
      .addMatcher(
        bankApi.endpoints.getAllBankTransactions.matchRejected,
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      );
  }
});

export const {
  setTransactions,
  setCurrentTransaction,
  setPagination,
  setFilters,
  setDateRange,
  resetFilters,
} = bankSlice.actions;

export default bankSlice.reducer; 