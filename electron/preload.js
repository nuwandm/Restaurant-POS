const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  database: (args) => ipcRenderer.invoke("db:query", args),
  batch: (operations) => ipcRenderer.invoke("db:batch", operations),
  processPayment: (data) => ipcRenderer.invoke("payment:process", data),
  printReceipt: (data) => ipcRenderer.invoke("printer:receipt", data),
  printKot:     (data) => ipcRenderer.invoke("printer:kot", data),
  printVoidKot: (data) => ipcRenderer.invoke("printer:voidKot", data),
  license: {
    check:    ()      => ipcRenderer.invoke("license:check"),
    activate: (key)   => ipcRenderer.invoke("license:activate", { key }),
  },
  closeApp:    () => ipcRenderer.invoke("app:close"),
  minimizeApp: () => ipcRenderer.invoke("app:minimize"),
  maximizeApp: () => ipcRenderer.invoke("app:maximize"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
});
