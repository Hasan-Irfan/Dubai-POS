import { createSlice } from '@reduxjs/toolkit';
import { cashApi } from '@/api/cashApi';

const initialState = {
  entries: [],
  currentEntry: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    type: 'all',
    dateRange: {
      from: '',
      to: '',
    },
  },
  loading: false,
  error: null,
};

export const cashSlice = createSlice({
  name: 'cash',
  initialState,
  reducers: {
    setEntries: (state, action) => {
      state.entries = action.payload;
    },
    setCurrentEntry: (state, action) => {
      state.currentEntry = action.payload;
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
        cashApi.endpoints.getAllCashEntries.matchPending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        cashApi.endpoints.getAllCashEntries.matchFulfilled,
        (state, action) => {
          state.loading = false;
          state.entries = action.payload.entries;
          state.pagination = action.payload.pagination;
          state.error = null;
        }
      )
      .addMatcher(
        cashApi.endpoints.getAllCashEntries.matchRejected,
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      );
  }
});

export const {
  setEntries,
  setCurrentEntry,
  setPagination,
  setFilters,
  setDateRange,
  resetFilters,
} = cashSlice.actions;

export default cashSlice.reducer; 