interface Project {
  path: string
  name: string
  enabled: boolean
}

interface GitCommit {
  message: string
  date: string
  author: string
}

interface WeeklyReport {
  startDate: string
  endDate: string
  projects: {
    name: string
    commits: string[]
  }[]
  nextWeekPlans: {
    project: string
    plans: string[]
  }[]
} 