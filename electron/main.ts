import { app, BrowserWindow, ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile('dist/index.html')
  }
}

app.whenReady().then(() => {
  createWindow()
})

async function getGitCommits(projectPath: string, author: string, since: string) {
  const { stdout } = await execAsync(
    `git log --since="${since}" --author="${author}" --pretty=format:"%s" --abbrev-commit`,
    { cwd: projectPath }
  )
  return stdout.split('\n')
    .map(line => line.replace(/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*/, ''))
    .filter(Boolean)
}

ipcMain.handle('generate-report', async (event, config) => {
  const { projects, dateRange } = config
  const author = await execAsync('git config user.name')
  const since = dateRange[0].toISOString()
  
  const reportData = await Promise.all(
    projects
      .filter(p => p.enabled)
      .map(async project => {
        const commits = await getGitCommits(project.path, author.stdout.trim(), since)
        return {
          name: project.name,
          commits
        }
      })
  )

  const reportContent = generateMarkdown(reportData)
  const fileName = `task - ${new Date().toISOString().slice(0, 10)}.md`
  
  fs.writeFileSync(fileName, reportContent)
  return { success: true, fileName }
})

function generateMarkdown(data) {
  let content = '### 本周工作总结\n\n'
  
  data.forEach(project => {
    content += `#### ${project.name}\n\n`
    project.commits.forEach((commit, index) => {
      content += `${index + 1}. ${commit}\n`
    })
    content += '\n'
  })
  
  content += `### 下周工作计划\n\n#### 智联\n\n1. 继续优化功能\n2. 处理测试反馈问题\n\n---\n`
  
  return content
} 