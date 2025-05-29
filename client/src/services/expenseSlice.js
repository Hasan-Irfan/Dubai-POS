import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  expenses: [],
  filters: {
    category: '',
    paymentType: '',
    paidToModel: '',
    paidTo: '',
    search: '',
    dateRange: { from: '', to: '' },
  },
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const expenseSlice = createSlice({
  name: 'expense',
  initialState,
  reducers: {
    setExpenses(state, action) {
      state.expenses = action.payload;
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
});

export const { setExpenses, setFilters, setPagination, resetFilters } = expenseSlice.actions;
export default expenseSlice.reducer; 