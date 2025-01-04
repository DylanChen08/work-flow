import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  generateReport: (config: any) => ipcRenderer.invoke('generate-report', config)
}) 