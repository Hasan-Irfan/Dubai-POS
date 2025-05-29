import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  username: localStorage.getItem("username") || null,
  role: localStorage.getItem("role") || null,
  email: localStorage.getItem("email") || null,
  userID: localStorage.getItem("userID") || null,
  isAuthenticated: !!localStorage.getItem("username"),
  loading: false,
  error: null,
  users: [],
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.username = action.payload.username;
      state.role = action.payload.role;
      state.userID = action.payload.userID;
      state.email = action.payload.email;
      localStorage.setItem("username", action.payload.username);
      localStorage.setItem("role", action.payload.role);
      localStorage.setItem("email", action.payload.email);
      localStorage.setItem("userID", action.payload.userID);
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.username = null;
      state.role = null;
      state.email = null; 
      state.userID = null;
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("userID");
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setUsers: (state, action) => {
      state.users = Array.isArray(action.payload) ? action.payload : [];
      state.error = null;
    },
    updateUserInStore: (state, action) => {
      const index = state.users.findIndex((u) => u._id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    deleteUserFromStore: (state, action) => {
      state.users = state.users.filter((u) => u._id !== action.payload);
    },
  },
});

export const {
  setUser,
  clearUser,
  setLoading,
  setError,
  setUsers,
  updateUserInStore,
  deleteUserFromStore,
} = userSlice.actions;

export default userSlice.reducer;
