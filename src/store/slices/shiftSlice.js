import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const loadOpenShift = createAsyncThunk('shift/loadOpen', async () => {
  const res = await window.electron.database({ action: 'getOpenShift' });
  if (!res.success) throw new Error(res.error);
  return res.data; // null if none open
});

export const openShift = createAsyncThunk('shift/open', async (openingFloat) => {
  const res = await window.electron.database({ action: 'openShift', data: { openingFloat } });
  if (!res.success) throw new Error(res.error);
  return res.data; // { shiftId }
});

export const closeShift = createAsyncThunk('shift/close', async ({ shiftId, closingCashCount, notes }) => {
  const res = await window.electron.database({ action: 'closeShift', data: { shiftId, closingCashCount, notes } });
  if (!res.success) throw new Error(res.error);
  return res.data;
});

export const loadShiftSummary = createAsyncThunk('shift/summary', async (shiftId) => {
  const res = await window.electron.database({ action: 'getShiftSummary', data: { shiftId } });
  if (!res.success) throw new Error(res.error);
  return res.data; // { shift, topItems }
});

const shiftSlice = createSlice({
  name: 'shift',
  initialState: {
    currentShift: null,   // open shift row or null
    shiftLoaded: false,   // true once we've checked DB on startup
    summary: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearShiftSummary: (state) => { state.summary = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOpenShift.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(loadOpenShift.fulfilled,(s, a) => { s.loading = false; s.currentShift = a.payload; s.shiftLoaded = true; })
      .addCase(loadOpenShift.rejected, (s, a) => { s.loading = false; s.error = a.error.message; s.shiftLoaded = true; })

      .addCase(openShift.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(openShift.fulfilled,(s, a) => {
        s.loading = false;
        // Re-fetch will populate currentShift; for now just mark with id so overlay closes
        s.currentShift = { id: a.payload.shiftId, status: 'open' };
      })
      .addCase(openShift.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(closeShift.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(closeShift.fulfilled,(s) => { s.loading = false; s.currentShift = null; })
      .addCase(closeShift.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(loadShiftSummary.pending,  (s) => { s.loading = true; })
      .addCase(loadShiftSummary.fulfilled,(s, a) => { s.loading = false; s.summary = a.payload; })
      .addCase(loadShiftSummary.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });
  },
});

export const { clearShiftSummary } = shiftSlice.actions;
export default shiftSlice.reducer;
