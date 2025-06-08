import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  employees: [],
  loading: false,
  error: null,
};

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    setEmployees: (state, action) => {
      state.employees = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    updateEmployeeInState: (state, action) => {
      const updated = action.payload;
      const index = state.employees.findIndex(emp => emp.id === updated.id);
      if (index !== -1) {
        state.employees[index] = { ...state.employees[index], ...updated };
      }
    },
    deleteEmployeeFromState: (state, action) => {
      const id = action.payload;
      state.employees = state.employees.filter(emp => emp.id !== id);
    },
  },
});

export const {
  setEmployees,
  setLoading,
  setError,
  updateEmployeeInState,
  deleteEmployeeFromState,
} = employeeSlice.actions;

export default employeeSlice.reducer;
