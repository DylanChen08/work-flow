import { contextBridge, ipcRenderer } from 'electron'

// 添加调试日志
console.log('Preload script executing')

contextBridge.exposeInMainWorld('electronAPI', {
  generateReport: (config: any) => ipcRenderer.invoke('generate-report', config),
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveReport: (data: any) => ipcRenderer.invoke('save-report', data)
})

// 添加调试日志
console.log('electronAPI exposed') 