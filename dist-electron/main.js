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
function ensureDataDirectory() {
  const dataDir = path__namespace.join(process.cwd(), "data");
  if (!fs__namespace.existsSync(dataDir)) {
    fs__namespace.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}
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
async function getGitUsers(projectPath) {
  try {
    console.log("Getting git users for path:", projectPath);
    const { stdout, stderr } = await execAsync(
      'git log --format="%an" | sort -u',
      { cwd: projectPath, encoding: "utf8" }
    );
    console.log("Git users stdout:", stdout);
    console.log("Git users stderr:", stderr);
    const output = String(stdout || "");
    const users = output.split("\n").map((line) => {
      try {
        return String(line || "").trim();
      } catch (error) {
        console.error("Error processing user line:", error, line);
        return "";
      }
    }).filter(Boolean);
    console.log("Processed users:", users);
    return users;
  } catch (error) {
    console.error("Failed to get git users:", error);
    return [];
  }
}
async function getGitCommits(projectPath, authors, since) {
  try {
    console.log("Getting git commits for path:", projectPath, "authors:", authors, "since:", since);
    const { stdout, stderr } = await execAsync(
      `git log --since="${since}" --pretty=format:"%an||%s" --abbrev-commit`,
      { cwd: projectPath, encoding: "utf8" }
    );
    console.log("Git commits stdout:", stdout);
    console.log("Git commits stderr:", stderr);
    const output = String(stdout || "");
    const commits = output.split("\n").filter((line) => {
      if (!line || typeof line !== "string") return false;
      const parts = line.split("||");
      if (parts.length < 2) return false;
      const [author] = parts;
      return authors.includes(author);
    }).map((line) => {
      try {
        const parts = line.split("||");
        if (parts.length < 2) return "";
        const [, message] = parts;
        const cleanMessage = String(message || "").replace(/^(feat|fix|refactor|style|perf|test|docs|chore|build|ci|revert|merge)(\([^)]*\))?:\s*/, "");
        return cleanMessage.trim();
      } catch (error) {
        console.error("Error processing commit line:", error, line);
        return "";
      }
    }).filter(Boolean);
    console.log("Processed commits:", commits);
    return commits;
  } catch (error) {
    console.error("Error in getGitCommits:", error);
    return [];
  }
}
electron.ipcMain.handle("get-git-users", async (event, projectPath) => {
  try {
    console.log("IPC: get-git-users called with path:", projectPath);
    const users = await getGitUsers(projectPath);
    console.log("IPC: getGitUsers returned:", users);
    const safeUsers = users.map((user) => {
      try {
        return String(user || "").trim();
      } catch (error) {
        console.error("Error converting user to string:", error);
        return "";
      }
    }).filter(Boolean);
    console.log("IPC: returning safe users:", safeUsers);
    return { users: safeUsers };
  } catch (error) {
    console.error(`Failed to get users for ${projectPath}:`, error);
    return { users: [] };
  }
});
electron.ipcMain.handle("generate-report", async (event, config) => {
  const { path: path2, startDate, endDate, authors } = config;
  try {
    console.log("IPC: generate-report called with config:", config);
    if (!path2 || !startDate || !endDate || !Array.isArray(authors)) {
      console.error("Invalid parameters:", { path: path2, startDate, endDate, authors });
      return { commits: [] };
    }
    const since = new Date(startDate).toISOString();
    console.log("IPC: calling getGitCommits with since:", since);
    const commits = await getGitCommits(path2, authors, since);
    console.log("IPC: getGitCommits returned:", commits);
    const safeCommits = commits.map((commit) => {
      try {
        return String(commit || "").trim();
      } catch (error) {
        console.error("Error converting commit to string:", error);
        return "";
      }
    }).filter(Boolean);
    console.log("IPC: returning safe commits:", safeCommits);
    return { commits: safeCommits };
  } catch (error) {
    console.error(`Failed to get commits for ${path2}:`, error);
    return { commits: [] };
  }
});
electron.ipcMain.handle("save-report", async (event, { content, fileName }) => {
  try {
    const dataDir = ensureDataDirectory();
    const filePath = path__namespace.join(dataDir, fileName);
    fs__namespace.writeFileSync(filePath, content, "utf8");
    return { success: true, fileName: filePath };
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
