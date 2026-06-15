import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const EMPTY_ORDER = () => ({
  orderId: null,
  orderNumber: null,
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  dbCreated: false, // whether this order has been saved to DB
});

const recalc = (order) => {
  order.subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
};

// Load all pending orders from DB into tableOrders map on app start / refresh
export const loadPendingOrders = createAsyncThunk(
  "orders/loadPending",
  async () => {
    const result = await window.electron.database({ action: "getPendingOrdersWithItems" });
    if (result.success) return result.data;
    throw new Error(result.error);
  }
);

export const fetchActiveOrders = createAsyncThunk(
  "orders/fetchActive",
  async () => {
    const result = await window.electron.database({ action: "getActiveOrders" });
    if (result.success) return result.data;
    throw new Error(result.error);
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState: {
    tableOrders: {}, // keyed by tableId
    activeOrders: [],
    loading: false,
    error: null,
  },
  reducers: {
    addToOrder: (state, action) => {
      const { tableId, item } = action.payload;
      if (!state.tableOrders[tableId]) {
        state.tableOrders[tableId] = EMPTY_ORDER();
      }
      const order = state.tableOrders[tableId];
      const existing = order.items.find((i) => i.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        order.items.push({ ...item, quantity: 1, orderItemId: uuidv4() });
      }
      recalc(order);
    },

    updateItemQuantity: (state, action) => {
      const { tableId, itemId, quantity } = action.payload;
      const order = state.tableOrders[tableId];
      if (!order) return;
      if (quantity <= 0) {
        order.items = order.items.filter((i) => i.orderItemId !== itemId);
      } else {
        const item = order.items.find((i) => i.orderItemId === itemId);
        if (item) item.quantity = quantity;
      }
      recalc(order);
    },

    markOrderCreated: (state, action) => {
      const { tableId, orderId, orderNumber } = action.payload;
      if (state.tableOrders[tableId]) {
        state.tableOrders[tableId].orderId = orderId;
        state.tableOrders[tableId].orderNumber = orderNumber;
        state.tableOrders[tableId].dbCreated = true;
      }
    },

    clearTableOrder: (state, action) => {
      const tableId = action.payload;
      delete state.tableOrders[tableId];
    },

    voidItem: (state, action) => {
      const { tableId, orderItemId, reason } = action.payload;
      const order = state.tableOrders[tableId];
      if (!order) return;
      const item = order.items.find(i => i.orderItemId === orderItemId);
      if (item) {
        item.voided = true;
        item.void_reason = reason;
      }
      // Recalculate subtotal from non-voided items only
      order.subtotal = order.items
        .filter(i => !i.voided)
        .reduce((s, i) => s + i.price * i.quantity, 0);
    },

    setDiscount: (state, action) => {
      const { tableId, discountAmount, discountType, discountReason } = action.payload;
      const order = state.tableOrders[tableId];
      if (!order) return;
      order.discountAmount = discountAmount;
      order.discountType   = discountType;
      order.discountReason = discountReason;
    },

    clearDiscount: (state, action) => {
      const tableId = action.payload;
      const order = state.tableOrders[tableId];
      if (!order) return;
      order.discountAmount = 0;
      order.discountType   = null;
      order.discountReason = null;
    },

    // kept for compatibility
    clearOrder: (state) => {
      state.tableOrders = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchActiveOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.activeOrders = action.payload;
      })
      .addCase(fetchActiveOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(loadPendingOrders.fulfilled, (state, action) => {
        for (const order of action.payload) {
          const tableId = order.table_id ?? 'takeaway';
          if (!state.tableOrders[tableId]) {
            const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
            state.tableOrders[tableId] = {
              orderId: order.id,
              orderNumber: order.order_number,
              items: order.items,
              subtotal,
              dbCreated: true,
            };
          }
        }
      });
  },
});

export const {
  addToOrder,
  updateItemQuantity,
  markOrderCreated,
  clearTableOrder,
  voidItem,
  setDiscount,
  clearDiscount,
  clearOrder,
} = orderSlice.actions;

export default orderSlice.reducer;
