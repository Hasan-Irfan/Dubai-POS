import { createSlice } from '@reduxjs/toolkit';
import { vendorApi } from '@/api/vendorApis';

const initialState = {
  vendors: [],
  currentVendor: null,
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
  transactionPagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    search: '',
    dateRange: {
      from: '',
      to: '',
    },
  },
  transactionFilters: {
    vendorId: null,
    type: 'all',
    dateRange: {
      from: '',
      to: '',
    },
  },
  loading: false,
  error: null,
};

export const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setVendors: (state, action) => {
      state.vendors = action.payload;
    },
    setCurrentVendor: (state, action) => {
      state.currentVendor = action.payload;
    },
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    setCurrentTransaction: (state, action) => {
      state.currentTransaction = action.payload;
    },
    setPagination: (state, action) => {
      state.pagination = action.payload;
    },
    setTransactionPagination: (state, action) => {
      state.transactionPagination = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setTransactionFilters: (state, action) => {
      state.transactionFilters = { ...state.transactionFilters, ...action.payload };
    },
    setDateRange: (state, action) => {
      state.filters.dateRange = action.payload;
    },
    setTransactionDateRange: (state, action) => {
      state.transactionFilters.dateRange = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination = initialState.pagination;
    },
    resetTransactionFilters: (state) => {
      state.transactionFilters = initialState.transactionFilters;
      state.transactionPagination = initialState.transactionPagination;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    addVendor: (state, action) => {
      state.vendors.unshift(action.payload); // Add to beginning of array
    },
    updateVendorInState: (state, action) => {
      const updated = action.payload;
      const index = state.vendors.findIndex((vendor) => vendor._id === updated._id);
      if (index !== -1) {
        state.vendors[index] = { ...state.vendors[index], ...updated };
      }
    },
    deleteVendorFromState: (state, action) => {
      const id = action.payload;
      state.vendors = state.vendors.filter((vendor) => vendor._id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      // Vendors
      .addMatcher(
        vendorApi.endpoints.getAllVendors.matchPending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        vendorApi.endpoints.getAllVendors.matchFulfilled,
        (state, action) => {
          state.loading = false;
          state.vendors = action.payload.vendors;
          state.pagination = action.payload.pagination;
          state.error = null;
        }
      )
      .addMatcher(
        vendorApi.endpoints.getAllVendors.matchRejected,
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      )
      // Vendor Transactions
      .addMatcher(
        vendorApi.endpoints.getVendorTransactions.matchPending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        vendorApi.endpoints.getVendorTransactions.matchFulfilled,
        (state, action) => {
          state.loading = false;
          state.transactions = action.payload.transactions;
          state.transactionPagination = action.payload.pagination;
          state.error = null;
        }
      )
      .addMatcher(
        vendorApi.endpoints.getVendorTransactions.matchRejected,
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      );
  },
});

export const {
  setVendors,
  setCurrentVendor,
  setTransactions,
  setCurrentTransaction,
  setPagination,
  setTransactionPagination,
  setFilters,
  setTransactionFilters,
  setDateRange,
  setTransactionDateRange,
  resetFilters,
  resetTransactionFilters,
  setLoading,
  setError,
  addVendor,
  updateVendorInState,
  deleteVendorFromState,
} = vendorSlice.actions;

export default vendorSlice.reducer;
