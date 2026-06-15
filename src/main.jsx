import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { store } from "./store";
import "./index.css";
import "./electronShim.js";

// Performance: Strict Mode only in development
const RootComponent = import.meta.env.DEV ? (
  <React.StrictMode>
    <Provider store={store}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#ffffff",
            color: "#111827",
            boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            borderRadius: "10px",
            fontWeight: 500,
          },
        }}
      />
    </Provider>
  </React.StrictMode>
) : (
  <Provider store={store}>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#ffffff",
          color: "#111827",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          borderRadius: "10px",
          fontWeight: 500,
        },
      }}
    />
  </Provider>
);

ReactDOM.createRoot(document.getElementById("root")).render(RootComponent);
