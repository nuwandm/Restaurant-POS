import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchTables = createAsyncThunk("tables/fetch", async () => {
  const result = await window.electron.database({
    action: "getTables",
  });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
});

const tableSlice = createSlice({
  name: "tables",
  initialState: {
    tables: [],
    selectedTable: null,
    loading: false,
    error: null,
  },
  reducers: {
    selectTable: (state, action) => {
      state.selectedTable = action.payload;
    },
    clearTable: (state, action) => {
      const table = state.tables.find((t) => t.id === action.payload);
      if (table) {
        table.status = "available";
        table.active_order_id = null;
      }
      if (state.selectedTable?.id === action.payload) {
        state.selectedTable = null;
      }
    },
    updateTableStatus: (state, action) => {
      const table = state.tables.find((t) => t.id === action.payload.tableId);
      if (table) {
        table.status = action.payload.status;
      }
      if (state.selectedTable?.id === action.payload.tableId) {
        state.selectedTable.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.tables = action.payload;
        state.loading = false;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { selectTable, clearTable, updateTableStatus } =
  tableSlice.actions;
export default tableSlice.reducer;
