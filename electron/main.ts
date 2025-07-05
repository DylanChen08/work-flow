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
    const { stdout } = await execAsync(
      'git log --format="%an" | sort -u',
      { cwd: projectPath }
    )
    return stdout.split('\n').filter(Boolean)
  } catch (error) {
    console.error('Failed to get git users:', error)
    return []
  }
}

async function getGitCommits(projectPath: string, authors: string[], since: string) {
  const authorPattern = authors.map(author => `"${author}"`).join('|')
  const { stdout } = await execAsync(
    `git log --since="${since}" --pretty=format:"%an||%s" --abbrev-commit`,
    { cwd: projectPath }
  )
  return stdout.split('\n')
    .filter(line => {
      const [author] = line.split('||')
      return authors.includes(author)
    })
    .map(line => {
      const [, message] = line.split('||')
      return message.replace(/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*/, '')
    })
    .filter(Boolean)
}

ipcMain.handle('get-git-users', async (event, projectPath) => {
  try {
    const users = await getGitUsers(projectPath)
    return { users }
  } catch (error) {
    console.error(`Failed to get users for ${projectPath}:`, error)
    return { users: [] }
  }
})

ipcMain.handle('generate-report', async (event, config) => {
  const { path, startDate, endDate, authors } = config
  try {
    if (!path || !startDate || !endDate || !Array.isArray(authors)) {
      console.error('Invalid parameters:', { path, startDate, endDate, authors })
      return { commits: [] }
    }

    const since = new Date(startDate).toISOString()
    const commits = await getGitCommits(path, authors, since)
    
    return { commits: commits.map(commit => String(commit)) }
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