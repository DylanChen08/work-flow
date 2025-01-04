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
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
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
  const { projects, dateRange } = config;
  const author = await execAsync("git config user.name");
  const since = dateRange[0].toISOString();
  const reportData = await Promise.all(
    projects.filter((p) => p.enabled).map(async (project) => {
      const commits = await getGitCommits(project.path, author.stdout.trim(), since);
      return {
        name: project.name,
        commits
      };
    })
  );
  const reportContent = generateMarkdown(reportData);
  const fileName = `task - ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.md`;
  fs__namespace.writeFileSync(fileName, reportContent);
  return { success: true, fileName };
});
function generateMarkdown(data) {
  let content = "### 本周工作总结\n\n";
  data.forEach((project) => {
    content += `#### ${project.name}

`;
    project.commits.forEach((commit, index) => {
      content += `${index + 1}. ${commit}
`;
    });
    content += "\n";
  });
  content += `### 下周工作计划

#### 智联

1. 继续优化功能
2. 处理测试反馈问题

---
`;
  return content;
}
