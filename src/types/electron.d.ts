interface Window {
  electronAPI: {
    generateReport: (config: {
      path: string,
      startDate: string,
      endDate: string
    }) => Promise<{ commits: string[] }>,
    selectDirectory: () => Promise<string>,
    saveReport: (data: { content: string, fileName: string }) => Promise<{ success: boolean, fileName: string }>
  }
} 