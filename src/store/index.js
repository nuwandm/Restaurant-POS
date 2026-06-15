import { configureStore } from "@reduxjs/toolkit";
import tableReducer from "./slices/tableSlice";
import menuReducer from "./slices/menuSlice";
import orderReducer from "./slices/orderSlice";
import shiftReducer from "./slices/shiftSlice";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    tables: tableReducer,
    menu: menuReducer,
    orders: orderReducer,
    shift: shiftReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
