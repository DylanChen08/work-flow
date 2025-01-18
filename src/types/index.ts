export interface Project {
  path: string
  name: string
  enabled: boolean
  selectedUsers: string[]
  users?: string[]
}

export interface WeeklyReport {
  content: string
  fileName: string
}

declare global {
  interface Window {
    electronAPI: {
      generateReport: (config: { path: string; startDate: string; endDate: string; authors: string[] }) => Promise<{ commits: string[] }>
      selectDirectory: () => Promise<string>
      saveReport: (data: WeeklyReport) => Promise<{ success: boolean; fileName: string }>
      getGitUsers: (projectPath: string) => Promise<{ users: string[] }>
    }
  }
}

export {} 