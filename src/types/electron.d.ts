interface Window {
  electronAPI: {
    generateReport: (config: any) => Promise<{ success: boolean; fileName: string }>
  }
} 