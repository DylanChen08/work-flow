import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

let mainWindow: BrowserWindow | null = null

// 确保 data 文件夹存在
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false
    }
  })

  console.log('Preload path:', path.join(__dirname, 'preload.js'))

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile('dist/index.html')
  }
}

app.whenReady().then(() => {
  createWindow()
})

async function getGitUsers(projectPath: string) {
  try {
    console.log('Getting git users for path:', projectPath)
    const { stdout, stderr } = await execAsync(
      'git log --format="%an" | sort -u',
      { cwd: projectPath, encoding: 'utf8' }
    )
    
    console.log('Git users stdout:', stdout)
    console.log('Git users stderr:', stderr)
    
    // 确保stdout是字符串类型并清理数据
    const output = String(stdout || '')
    const users = output.split('\n')
      .map(line => {
        try {
          return String(line || '').trim()
        } catch (error) {
          console.error('Error processing user line:', error, line)
          return ''
        }
      })
      .filter(Boolean)
    
    console.log('Processed users:', users)
    return users
  } catch (error) {
    console.error('Failed to get git users:', error)
    return []
  }
}

async function getGitCommits(projectPath: string, authors: string[], since: string) {
  try {
    console.log('Getting git commits for path:', projectPath, 'authors:', authors, 'since:', since)
    const { stdout, stderr } = await execAsync(
      `git log --since="${since}" --pretty=format:"%an||%s" --abbrev-commit`,
      { cwd: projectPath, encoding: 'utf8' }
    )
    
    console.log('Git commits stdout:', stdout)
    console.log('Git commits stderr:', stderr)
    
    // 确保stdout是字符串类型
    const output = String(stdout || '')
    
    const commits = output.split('\n')
      .filter(line => {
        if (!line || typeof line !== 'string') return false
        const parts = line.split('||')
        if (parts.length < 2) return false
        const [author] = parts
        return authors.includes(author)
      })
      .map(line => {
        try {
          const parts = line.split('||')
          if (parts.length < 2) return ''
          const [, message] = parts
          // 确保message是字符串并清理
          const cleanMessage = String(message || '').replace(/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*/, '')
          return cleanMessage.trim()
        } catch (error) {
          console.error('Error processing commit line:', error, line)
          return ''
        }
      })
      .filter(Boolean)
    
    console.log('Processed commits:', commits)
    return commits
  } catch (error) {
    console.error('Error in getGitCommits:', error)
    return []
  }
}

ipcMain.handle('get-git-users', async (event, projectPath) => {
  try {
    console.log('IPC: get-git-users called with path:', projectPath)
    const users = await getGitUsers(projectPath)
    console.log('IPC: getGitUsers returned:', users)
    
    // 确保所有用户都是字符串类型
    const safeUsers = users.map(user => {
      try {
        return String(user || '').trim()
      } catch (error) {
        console.error('Error converting user to string:', error)
        return ''
      }
    }).filter(Boolean)
    
    console.log('IPC: returning safe users:', safeUsers)
    return { users: safeUsers }
  } catch (error) {
    console.error(`Failed to get users for ${projectPath}:`, error)
    return { users: [] }
  }
})

ipcMain.handle('generate-report', async (event, config) => {
  const { path, startDate, endDate, authors } = config
  try {
    console.log('IPC: generate-report called with config:', config)
    
    if (!path || !startDate || !endDate || !Array.isArray(authors)) {
      console.error('Invalid parameters:', { path, startDate, endDate, authors })
      return { commits: [] }
    }

    const since = new Date(startDate).toISOString()
    console.log('IPC: calling getGitCommits with since:', since)
    const commits = await getGitCommits(path, authors, since)
    console.log('IPC: getGitCommits returned:', commits)
    
    // 确保所有commit都是字符串类型
    const safeCommits = commits.map(commit => {
      try {
        return String(commit || '').trim()
      } catch (error) {
        console.error('Error converting commit to string:', error)
        return ''
      }
    }).filter(Boolean)
    
    console.log('IPC: returning safe commits:', safeCommits)
    return { commits: safeCommits }
  } catch (error) {
    console.error(`Failed to get commits for ${path}:`, error)
    return { commits: [] }
  }
})

ipcMain.handle('save-report', async (event, { content, fileName }) => {
  try {
    const dataDir = ensureDataDirectory()
    const filePath = path.join(dataDir, fileName)
    fs.writeFileSync(filePath, content, 'utf8')
    return { success: true, fileName: filePath }
  } catch (error) {
    console.error('Failed to save report:', error)
    throw error
  }
})

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) {
    return ''
  }
  return filePaths[0]
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
}) 