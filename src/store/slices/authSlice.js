import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const loginWithPin = createAsyncThunk('auth/loginWithPin', async (pin) => {
  const res = await window.electron.database({ action: 'loginWithPin', data: { pin } });
  if (!res.success) throw new Error(res.error || res.data?.error || 'Invalid PIN');
  return res.data.staff; // { id, name, role }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    currentUser: null,  // { id, name, role }
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.currentUser = null;
      state.error = null;
    },
    clearAuthError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithPin.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(loginWithPin.fulfilled,(s, a) => { s.loading = false; s.currentUser = a.payload; })
      .addCase(loginWithPin.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
