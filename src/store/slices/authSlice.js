import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// payload: { pin, id? } — id ties the login to a specific staff member selected on screen
export const loginWithPin = createAsyncThunk('auth/loginWithPin', async ({ pin, id }) => {
  const res = await window.electron.database({ action: 'loginWithPin', data: { pin, id } });
  // IPC wraps every result: { success: true, data: <DB result> }
  // The DB loginWithPin itself returns { success: bool, staff?, error? }
  if (!res.success || !res.data?.success) throw new Error(res.data?.error || res.error || 'Invalid PIN');
  return res.data.staff; // { id, name, role, pin_reset_required }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    currentUser: null,  // { id, name, role, pin_reset_required }
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.currentUser = null;
      state.error = null;
    },
    clearAuthError: (state) => { state.error = null; },
    clearPinResetRequired: (state) => {
      if (state.currentUser) state.currentUser.pin_reset_required = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginWithPin.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(loginWithPin.fulfilled,(s, a) => { s.loading = false; s.currentUser = a.payload; })
      .addCase(loginWithPin.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });
  },
});

export const { logout, clearAuthError, clearPinResetRequired } = authSlice.actions;
export default authSlice.reducer;
