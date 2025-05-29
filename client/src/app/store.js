import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '@/api/authApi';
import { userApi } from '@/api/userApi';
import { employeeApi } from '@/api/employeeApi';
import { salesApi } from '@/api/salesApi';
import { bankApi } from '@/api/bankApi';
import { cashApi } from '@/api/cashApi';
import { dashboardApi } from '@/api/dashboardApi';
import userReducer from '@/services/userSlice';
import employeeReducer from '@/services/employeeSlice';
import vendorReducer from '@/services/vendorSlice';
import salesReducer from '@/services/salesSlice';
import bankReducer from '@/services/bankSlice';
import cashReducer from '@/services/cashSlice';
import { vendorApi } from '@/api/vendorApis';
import expenseReducer from '@/services/expenseSlice';
import { expenseApi } from '@/api/expenseApi';
import { reportApi } from '@/api/reportApi';
import { auditApi } from '@/api/auditApi';
import { setupListeners } from '@reduxjs/toolkit/query';

const store = configureStore({
  reducer: {
    user: userReducer,
    employee: employeeReducer,
    vendor: vendorReducer,
    sales: salesReducer,
    bank: bankReducer,
    cash: cashReducer,
    expense: expenseReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [employeeApi.reducerPath]: employeeApi.reducer,
    [vendorApi.reducerPath]: vendorApi.reducer,
    [salesApi.reducerPath]: salesApi.reducer,
    [bankApi.reducerPath]: bankApi.reducer,
    [cashApi.reducerPath]: cashApi.reducer,
    [expenseApi.reducerPath]: expenseApi.reducer,
    [reportApi.reducerPath]: reportApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userApi.middleware,
      employeeApi.middleware,
      vendorApi.middleware,
      salesApi.middleware,
      bankApi.middleware,
      cashApi.middleware,
      expenseApi.middleware,
      reportApi.middleware,
      auditApi.middleware,
      dashboardApi.middleware
    ),
});

setupListeners(store.dispatch);

export default store;