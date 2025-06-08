import { createSlice } from '@reduxjs/toolkit';
import { salesApi } from '@/api/salesApi';

const initialState = {
  invoices: [],
  currentInvoice: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    status: 'all',
    salesmanId: '',
    customerName: '',
    dateRange: {
      from: '',
      to: '',
    },
  },
  loading: false,
  error: null,
};

export const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    setInvoices: (state, action) => {
      state.invoices = action.payload;
    },
    setCurrentInvoice: (state, action) => {
      state.currentInvoice = action.payload;
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
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination = initialState.pagination;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    updateInvoiceInState: (state, action) => {
      const updatedInvoice = action.payload;
      state.invoices = state.invoices.map(invoice => 
        invoice._id === updatedInvoice._id ? updatedInvoice : invoice
      );
      if (state.currentInvoice?._id === updatedInvoice._id) {
        state.currentInvoice = updatedInvoice;
      }
    },
    removeInvoiceFromState: (state, action) => {
      const invoiceId = action.payload;
      state.invoices = state.invoices.filter(invoice => invoice._id !== invoiceId);
      if (state.currentInvoice?._id === invoiceId) {
        state.currentInvoice = null;
      }
      if (state.pagination.total > 0) {
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      }
    },
    addPaymentToInvoice: (state, action) => {
      const { invoiceId, payment } = action.payload;
      state.invoices = state.invoices.map(invoice => {
        if (invoice._id === invoiceId) {
          const updatedPayments = [...invoice.payments, payment];
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...invoice,
            payments: updatedPayments,
            status: totalPaid >= invoice.totals.grandTotal ? 'Paid' : 'Partially Paid'
          };
        }
        return invoice;
      });
      if (state.currentInvoice?._id === invoiceId) {
        const updatedPayments = [...state.currentInvoice.payments, payment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        state.currentInvoice = {
          ...state.currentInvoice,
          payments: updatedPayments,
          status: totalPaid >= state.currentInvoice.totals.grandTotal ? 'Paid' : 'Partially Paid'
        };
      }
    },
    removePaymentFromInvoice: (state, action) => {
      const { invoiceId, paymentId } = action.payload;
      state.invoices = state.invoices.map(invoice => {
        if (invoice._id === invoiceId) {
          const updatedPayments = invoice.payments.filter(p => p.id !== paymentId);
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...invoice,
            payments: updatedPayments,
            status: totalPaid === 0 ? 'Unpaid' : totalPaid >= invoice.totals.grandTotal ? 'Paid' : 'Partially Paid'
          };
        }
        return invoice;
      });
      if (state.currentInvoice?._id === invoiceId) {
        const updatedPayments = state.currentInvoice.payments.filter(p => p.id !== paymentId);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        state.currentInvoice = {
          ...state.currentInvoice,
          payments: updatedPayments,
          status: totalPaid === 0 ? 'Unpaid' : totalPaid >= state.currentInvoice.totals.grandTotal ? 'Paid' : 'Partially Paid'
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle getAllInvoices states
      .addMatcher(
        salesApi.endpoints.getAllInvoices.matchPending,
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        salesApi.endpoints.getAllInvoices.matchFulfilled,
        (state, action) => {
          state.loading = false;
          state.invoices = action.payload.invoices;
          state.pagination = action.payload.pagination;
          state.error = null;
        }
      )
      .addMatcher(
        salesApi.endpoints.getAllInvoices.matchRejected,
        (state, action) => {
          state.loading = false;
          state.error = action.error.message;
        }
      );
  }
});

export const {
  setInvoices,
  setCurrentInvoice,
  setPagination,
  setFilters,
  setDateRange,
  setLoading,
  setError,
  resetFilters,
  clearCurrentInvoice,
  updateInvoiceInState,
  removeInvoiceFromState,
  addPaymentToInvoice,
  removePaymentFromInvoice,
} = salesSlice.actions;

export default salesSlice.reducer; 