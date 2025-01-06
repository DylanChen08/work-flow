"use strict";
const electron = require("electron");
const child_process = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const execAsync = util.promisify(child_process.exec);
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path__namespace.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false
    }
  });
  console.log("Preload path:", path__namespace.join(__dirname, "preload.js"));
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile("dist/index.html");
  }
}
electron.app.whenReady().then(() => {
  createWindow();
});
async function getGitCommits(projectPath, author, since) {
  const { stdout } = await execAsync(
    `git log --since="${since}" --author="${author}" --pretty=format:"%s" --abbrev-commit`,
    { cwd: projectPath }
  );
  return stdout.split("\n").map((line) => line.replace(/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*/, "")).filter(Boolean);
}
electron.ipcMain.handle("generate-report", async (event, config) => {
  const { path: path2, startDate, endDate } = config;
  try {
    const author = await execAsync("git config user.name");
    const commits = await getGitCommits(path2, author.stdout.trim(), startDate);
    return { commits };
  } catch (error) {
    console.error(`Failed to get commits for ${path2}:`, error);
    return { commits: [] };
  }
});
electron.ipcMain.handle("save-report", async (event, { content, fileName }) => {
  try {
    fs__namespace.writeFileSync(fileName, content);
    return { success: true, fileName };
  } catch (error) {
    console.error("Failed to save report:", error);
    throw error;
  }
});
electron.ipcMain.handle("dialog:openDirectory", async () => {
  const { canceled, filePaths } = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  if (canceled) {
    return "";
  }
  return filePaths[0];
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
