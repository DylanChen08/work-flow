"use strict";
const electron = require("electron");
console.log("Preload script executing");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  generateReport: (config) => electron.ipcRenderer.invoke("generate-report", config),
  selectDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  saveReport: (data) => electron.ipcRenderer.invoke("save-report", data)
});
console.log("electronAPI exposed");
