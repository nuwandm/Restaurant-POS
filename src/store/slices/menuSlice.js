import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const addMenuItem = createAsyncThunk("menu/addItem", async (item) => {
  const result = await window.electron.database({ action: "addMenuItem", data: item });
  if (!result.success) throw new Error(result.error);
  return item;
});

export const updateMenuItem = createAsyncThunk("menu/updateItem", async (item) => {
  const result = await window.electron.database({ action: "updateMenuItem", data: item });
  if (!result.success) throw new Error(result.error);
  return item;
});

export const deleteMenuItem = createAsyncThunk("menu/deleteItem", async (id) => {
  const result = await window.electron.database({ action: "deleteMenuItem", data: { id } });
  if (!result.success) throw new Error(result.error);
  return id;
});

export const addCategory = createAsyncThunk("menu/addCategory", async (category) => {
  const result = await window.electron.database({ action: "addCategory", data: category });
  if (!result.success) throw new Error(result.error);
  return category;
});

export const fetchMenuItems = createAsyncThunk("menu/fetchItems", async () => {
  const result = await window.electron.database({
    action: "getMenuItems",
  });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
});

export const fetchCategories = createAsyncThunk(
  "menu/fetchCategories",
  async () => {
    const result = await window.electron.database({
      action: "getCategories",
    });

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error);
    }
  }
);

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    items: [],
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(addMenuItem.fulfilled, (state) => {
        // refetch will happen after add
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], ...action.payload };
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        // refetch will happen after add
      });
  },
});

export default menuSlice.reducer;
