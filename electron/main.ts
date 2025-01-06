import { app, BrowserWindow, ipcMain, dialog } from 'electron'
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
  const { path, startDate, endDate } = config
  try {
    const author = await execAsync('git config user.name')
    const commits = await getGitCommits(path, author.stdout.trim(), startDate)
    return { commits }
  } catch (error) {
    console.error(`Failed to get commits for ${path}:`, error)
    return { commits: [] }
  }
})

ipcMain.handle('save-report', async (event, { content, fileName }) => {
  try {
    fs.writeFileSync(fileName, content)
    return { success: true, fileName }
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