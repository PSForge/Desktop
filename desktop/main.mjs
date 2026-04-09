import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell, Tray } from "electron";
import { execFile } from "node:child_process";
import electronUpdater from "electron-updater";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const isDev = !app.isPackaged;
const devServerUrl = process.env.PSFORGE_DESKTOP_URL || "http://127.0.0.1:5173";
const desktopUpdateFeedUrl = "https://www.psforge.app/api/desktop/updates";
const execFileAsync = promisify(execFile);
const { autoUpdater } = electronUpdater;

let mainWindow = null;
let splashWindow = null;
let localServer = null;
let localServerUrl = null;
let gitExecutablePath = null;
let appTray = null;
let isQuitting = false;
let updateCheckInterval = null;
let latestUpdateStatus = { state: "idle" };

function getDesktopStoragePath() {
  return path.join(app.getPath("userData"), "desktop-storage.json");
}

function readDesktopStorage() {
  try {
    const storagePath = getDesktopStoragePath();
    if (!fsSync.existsSync(storagePath)) {
      return {};
    }

    const raw = fsSync.readFileSync(storagePath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDesktopStorage(nextStorage) {
  const storagePath = getDesktopStoragePath();
  fsSync.mkdirSync(path.dirname(storagePath), { recursive: true });
  fsSync.writeFileSync(storagePath, JSON.stringify(nextStorage, null, 2), "utf8");
}

async function writeDesktopLog(message) {
  try {
    const logPath = path.join(app.getPath("userData"), "desktop.log");
    await fs.appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // Ignore log write failures.
  }
}

function sendUpdateStatus(status) {
  latestUpdateStatus = {
    ...status,
    timestamp: new Date().toISOString(),
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:update-status", latestUpdateStatus);
  }
}

function withDesktopFlag(url) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set("desktop", "1");
  return nextUrl.toString();
}

function getPreloadPath() {
  if (isDev) {
    return path.join(appRoot, "dist-electron", "preload.cjs");
  }

  return path.join(process.resourcesPath, "app.asar.unpacked", "dist-electron", "preload.cjs");
}

function getWindowIconPath() {
  if (isDev) {
    return path.join(appRoot, "build", "icon.ico");
  }

  return path.join(process.resourcesPath, "branding", "icon.ico");
}

function getTrayIconPath() {
  if (isDev) {
    return path.join(appRoot, "build", "icon.png");
  }

  return path.join(process.resourcesPath, "branding", "icon.png");
}

function getSplashImagePath() {
  if (isDev) {
    return path.join(appRoot, "build", "loading-screen.jpg");
  }

  return path.join(process.resourcesPath, "branding", "loading-screen.jpg");
}

function createSplashWindow() {
  const splashImageUrl = pathToFileURL(getSplashImagePath()).toString();
  splashWindow = new BrowserWindow({
    width: 720,
    height: 420,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#1550a6",
    icon: getWindowIconPath(),
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
    },
  });

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            html, body {
              margin: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: #1550a6;
            }

            body {
              display: grid;
              place-items: center;
              font-family: Segoe UI, Arial, sans-serif;
            }

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              user-select: none;
              -webkit-user-drag: none;
            }
          </style>
        </head>
        <body>
          <img src="${splashImageUrl}" alt="PSForge loading screen" />
        </body>
      </html>
    `)}`,
  );
}

function isPathInside(basePath, targetPath) {
  const base = path.resolve(basePath);
  const target = path.resolve(targetPath);
  const baseLower = base.toLowerCase();
  const targetLower = target.toLowerCase();
  return targetLower === baseLower || targetLower.startsWith(`${baseLower}${path.sep}`);
}

async function findGitExecutable() {
  if (gitExecutablePath) {
    return gitExecutablePath;
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["git"], { windowsHide: true });
    const match = stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && fsSync.existsSync(entry));

    if (match) {
      gitExecutablePath = match;
      return gitExecutablePath;
    }
  } catch {
    // Fall back to common install locations below.
  }

  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Git", "cmd", "git.exe"),
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Git", "bin", "git.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Git", "cmd", "git.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Git", "bin", "git.exe"),
    localAppData ? path.join(localAppData, "Programs", "Git", "cmd", "git.exe") : "",
    localAppData ? path.join(localAppData, "Programs", "Git", "bin", "git.exe") : "",
  ].filter(Boolean);

  const found = candidates.find((candidate) => fsSync.existsSync(candidate));
  gitExecutablePath = found || null;
  return gitExecutablePath;
}

async function runGitCommand(args, cwd) {
  const gitPath = await findGitExecutable();
  if (!gitPath) {
    throw new Error("Git for Windows was not found. Install Git to use desktop Git integration.");
  }

  await writeDesktopLog(`git ${args.join(" ")} [cwd=${cwd || process.cwd()}]`);

  try {
    const { stdout, stderr } = await execFileAsync(gitPath, args, {
      cwd,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr?.trim()) {
      await writeDesktopLog(`git stderr: ${stderr.trim()}`);
    }

    return {
      stdout: stdout?.trim() || "",
      stderr: stderr?.trim() || "",
      gitPath,
    };
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.stdout?.trim() || error?.message || "Git command failed.";
    await writeDesktopLog(`git failed: ${detail}`);
    throw new Error(detail);
  }
}

function parseChangedFiles(output) {
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2).trim() || "??",
      path: line.slice(3).trim(),
    }));
}

function parseCommitLog(output) {
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, message, author, date] = line.split("\t");
      return {
        sha,
        shortSha,
        message,
        author,
        date,
      };
    });
}

async function getGitRepoState(repoPath) {
  const normalizedRepoPath = path.resolve(repoPath || "");
  const gitPath = await findGitExecutable();

  if (!gitPath) {
    return {
      available: false,
      error: "Git for Windows was not found. Install Git to enable desktop Git features.",
      repoPath: normalizedRepoPath,
      rootPath: null,
      isRepo: false,
      currentBranch: null,
      branches: [],
      changedFiles: [],
      recentCommits: [],
    };
  }

  try {
    const { stdout: rootPath } = await runGitCommand(["rev-parse", "--show-toplevel"], normalizedRepoPath);
    const { stdout: currentBranch } = await runGitCommand(["branch", "--show-current"], rootPath);
    const { stdout: branchOutput } = await runGitCommand(["branch", "--format=%(refname:short)"], rootPath);
    const { stdout: statusOutput } = await runGitCommand(["status", "--short"], rootPath);

    let recentCommits = [];
    try {
      const { stdout: commitOutput } = await runGitCommand(
        ["log", "--pretty=format:%H%x09%h%x09%s%x09%an%x09%ad", "-n", "10", "--date=short"],
        rootPath,
      );
      recentCommits = parseCommitLog(commitOutput);
    } catch {
      recentCommits = [];
    }

    const branches = branchOutput ? branchOutput.split(/\r?\n/).map((branch) => branch.trim()).filter(Boolean) : [];

    return {
      available: true,
      repoPath: normalizedRepoPath,
      rootPath,
      isRepo: true,
      currentBranch: currentBranch || null,
      branches: branches.length > 0 ? branches : currentBranch ? [currentBranch] : [],
      changedFiles: parseChangedFiles(statusOutput),
      recentCommits,
    };
  } catch {
    return {
      available: true,
      repoPath: normalizedRepoPath,
      rootPath: null,
      isRepo: false,
      currentBranch: null,
      branches: [],
      changedFiles: [],
      recentCommits: [],
    };
  }
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Server not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

async function startLocalFrontendServer() {
  if (isDev) {
    await waitForServer(devServerUrl);
    return;
  }

  if (localServer && localServerUrl) {
    return;
  }

  const distRoot = path.join(appRoot, "dist", "public");
  const indexPath = path.join(distRoot, "index.html");

  localServer = http.createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
      const candidatePath = path.normalize(path.join(distRoot, normalizedPath));
      const safePath = candidatePath.startsWith(distRoot) ? candidatePath : indexPath;

      let filePath = safePath;
      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
      } catch {
        filePath = indexPath;
      }

      const body = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": getContentType(filePath) });
      res.end(body);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("PSForge Desktop failed to load.");
    }
  });

  await new Promise((resolve, reject) => {
    localServer.once("error", reject);
    localServer.listen(0, "127.0.0.1", () => resolve());
  });

  const address = localServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine local frontend server address");
  }

  localServerUrl = `http://127.0.0.1:${address.port}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0b1220",
    autoHideMenuBar: false,
    show: false,
    icon: getWindowIconPath(),
    title: "PSForge Desktop",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
    mainWindow?.setSkipTaskbar(true);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("query-session-end", () => {
    isQuitting = true;
  });

  mainWindow.on("session-end", () => {
    isQuitting = true;
  });

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    mainWindow?.show();
    if (latestUpdateStatus.state !== "idle") {
      mainWindow?.webContents.send("desktop:update-status", latestUpdateStatus);
    }
  });

  mainWindow.loadURL(withDesktopFlag(isDev ? devServerUrl : localServerUrl));
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  mainWindow.setSkipTaskbar(false);
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (appTray) {
    return;
  }

  const trayImage = nativeImage.createFromPath(getTrayIconPath()).resize({
    width: 18,
    height: 18,
  });

  appTray = new Tray(trayImage);
  appTray.setToolTip("PSForge Desktop");
  appTray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Check for Updates",
      click: () => checkForUpdates(true),
    },
    {
      type: "separator",
    },
    {
      label: "Open PSForge Desktop",
      click: () => showMainWindow(),
    },
    {
      type: "separator",
    },
    {
      label: "Exit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));

  appTray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
      return;
    }

    showMainWindow();
  });
}

async function checkForUpdates(manual = false) {
  if (isDev || !app.isPackaged) {
    return latestUpdateStatus;
  }

  try {
    if (manual) {
      sendUpdateStatus({ state: "checking" });
    }

    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeDesktopLog(`Auto-update failed: ${message}`);
    sendUpdateStatus({ state: "error", message });

    if (manual && mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Update check failed",
        message: "PSForge Desktop could not check for updates right now.",
        detail: message,
      });
    }
  }

  return latestUpdateStatus;
}

function configureAutoUpdater() {
  if (isDev || !app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: desktopUpdateFeedUrl,
  });

  autoUpdater.on("checking-for-update", async () => {
    await writeDesktopLog("Checking for desktop updates.");
    sendUpdateStatus({ state: "checking" });
  });

  autoUpdater.on("update-available", async (info) => {
    await writeDesktopLog(`Update available: ${info.version}`);
    sendUpdateStatus({
      state: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", async (info) => {
    await writeDesktopLog(`No update available. Current version: ${info.version || app.getVersion()}`);
    sendUpdateStatus({
      state: "up-to-date",
      version: info.version || app.getVersion(),
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      state: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    await writeDesktopLog(`Update downloaded: ${info.version}`);
    sendUpdateStatus({
      state: "downloaded",
      version: info.version,
    });

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update ready",
      message: "A new PSForge Desktop update has been downloaded.",
      detail: "Restart now to install the update, or choose Later to install it when the app closes.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", async (error) => {
    const message = error == null ? "Unknown auto-update error." : error.stack || error.message || String(error);
    await writeDesktopLog(`Auto-update error: ${message}`);
    sendUpdateStatus({
      state: "error",
      message,
    });
  });
}

ipcMain.handle("desktop:get-context", async () => ({
  isDesktop: true,
  platform: process.platform,
  version: app.getVersion(),
}));

ipcMain.handle("desktop:updates-get-state", async () => latestUpdateStatus);

ipcMain.handle("desktop:updates-check", async () => checkForUpdates(true));

ipcMain.handle("desktop:updates-install", async () => {
  isQuitting = true;
  autoUpdater.quitAndInstall();
  return { ok: true };
});

ipcMain.on("desktop:storage-get", (event, key) => {
  const storage = readDesktopStorage();
  event.returnValue = typeof key === "string" ? (storage[key] ?? null) : null;
});

ipcMain.on("desktop:storage-set", (event, payload) => {
  if (!payload || typeof payload.key !== "string") {
    event.returnValue = false;
    return;
  }

  const storage = readDesktopStorage();
  storage[payload.key] = typeof payload.value === "string" ? payload.value : "";
  writeDesktopStorage(storage);
  event.returnValue = true;
});

ipcMain.on("desktop:storage-remove", (event, key) => {
  if (typeof key !== "string") {
    event.returnValue = false;
    return;
  }

  const storage = readDesktopStorage();
  delete storage[key];
  writeDesktopStorage(storage);
  event.returnValue = true;
});

ipcMain.handle("desktop:open-script", async () => {
  if (!mainWindow) {
    return { canceled: true };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open PowerShell Script",
    properties: ["openFile"],
    filters: [
      { name: "PowerShell Scripts", extensions: ["ps1", "psm1", "psd1", "txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf8");

  return {
    canceled: false,
    filePath,
    fileName: path.basename(filePath),
    content,
  };
});

ipcMain.handle("desktop:open-directory", async () => {
  if (!mainWindow) {
    return { canceled: true };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Git Repository Folder",
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return {
    canceled: false,
    filePath: result.filePaths[0],
  };
});

ipcMain.handle("desktop:save-script", async (_event, payload) => {
  if (!mainWindow) {
    return { canceled: true };
  }

  const suggestedName = (payload?.defaultFileName || "script.ps1").replace(/[<>:\"/\\\\|?*]+/g, "-");

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save PowerShell Script",
    defaultPath: suggestedName.endsWith(".ps1") ? suggestedName : `${suggestedName}.ps1`,
    filters: [
      { name: "PowerShell Script", extensions: ["ps1"] },
      { name: "Text File", extensions: ["txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, payload?.content || "", "utf8");

  return {
    canceled: false,
    filePath: result.filePath,
    fileName: path.basename(result.filePath),
  };
});

ipcMain.handle("desktop:write-script-file", async (_event, payload) => {
  const filePath = typeof payload?.filePath === "string" ? payload.filePath : "";
  if (!filePath) {
    return { canceled: true };
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, payload?.content || "", "utf8");

  return {
    canceled: false,
    filePath,
    fileName: path.basename(filePath),
  };
});

ipcMain.handle("desktop:open-external", async (_event, url) => {
  if (typeof url === "string" && url) {
    await shell.openExternal(url);
    return { ok: true };
  }

  return { ok: false };
});

ipcMain.handle("desktop:open-path", async (_event, targetPath) => {
  if (typeof targetPath === "string" && targetPath) {
    const result = await shell.openPath(targetPath);
    return { ok: !result };
  }

  return { ok: false };
});

ipcMain.handle("desktop:git-status", async (_event, payload) => {
  const repoPath = typeof payload?.repoPath === "string" ? payload.repoPath : "";
  return getGitRepoState(repoPath);
});

ipcMain.handle("desktop:git-init", async (_event, payload) => {
  const repoPath = typeof payload?.repoPath === "string" ? path.resolve(payload.repoPath) : "";
  const branchName = typeof payload?.branchName === "string" && payload.branchName.trim() ? payload.branchName.trim() : "main";

  if (!repoPath) {
    throw new Error("Choose a folder before initializing a repository.");
  }

  await fs.mkdir(repoPath, { recursive: true });

  try {
    await runGitCommand(["init", "-b", branchName], repoPath);
  } catch {
    await runGitCommand(["init"], repoPath);
    try {
      await runGitCommand(["checkout", "-b", branchName], repoPath);
    } catch {
      // Ignore if the installed Git version already created the branch or cannot switch yet.
    }
  }

  return getGitRepoState(repoPath);
});

ipcMain.handle("desktop:git-create-branch", async (_event, payload) => {
  const repoPath = typeof payload?.repoPath === "string" ? payload.repoPath : "";
  const branchName = typeof payload?.branchName === "string" ? payload.branchName.trim() : "";
  const fromBranch = typeof payload?.fromBranch === "string" ? payload.fromBranch.trim() : "";

  if (!repoPath || !branchName) {
    throw new Error("A repository and branch name are required.");
  }

  const state = await getGitRepoState(repoPath);
  if (!state.isRepo || !state.rootPath) {
    throw new Error("Choose a valid Git repository first.");
  }

  if (fromBranch) {
    await runGitCommand(["checkout", fromBranch], state.rootPath);
  }

  await runGitCommand(["checkout", "-b", branchName], state.rootPath);
  return getGitRepoState(state.rootPath);
});

ipcMain.handle("desktop:git-checkout", async (_event, payload) => {
  const repoPath = typeof payload?.repoPath === "string" ? payload.repoPath : "";
  const branchName = typeof payload?.branchName === "string" ? payload.branchName.trim() : "";

  if (!repoPath || !branchName) {
    throw new Error("A repository and branch name are required.");
  }

  const state = await getGitRepoState(repoPath);
  if (!state.isRepo || !state.rootPath) {
    throw new Error("Choose a valid Git repository first.");
  }

  await runGitCommand(["checkout", branchName], state.rootPath);
  return getGitRepoState(state.rootPath);
});

ipcMain.handle("desktop:git-commit-script", async (_event, payload) => {
  const repoPath = typeof payload?.repoPath === "string" ? payload.repoPath : "";
  const relativePathRaw = typeof payload?.relativePath === "string" ? payload.relativePath.trim() : "";
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  const content = typeof payload?.content === "string" ? payload.content : "";

  if (!repoPath) {
    throw new Error("Choose a Git repository first.");
  }

  if (!message) {
    throw new Error("Enter a commit message before committing.");
  }

  const state = await getGitRepoState(repoPath);
  if (!state.isRepo || !state.rootPath) {
    throw new Error("Initialize a Git repository before committing.");
  }

  const relativePath = path.normalize(relativePathRaw || "script.ps1");
  if (path.isAbsolute(relativePath)) {
    throw new Error("Use a repository-relative file path.");
  }

  const targetPath = path.resolve(state.rootPath, relativePath);
  if (!isPathInside(state.rootPath, targetPath)) {
    throw new Error("The script path must stay inside the selected repository.");
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");

  await runGitCommand(["add", "--", relativePath], state.rootPath);
  const { stdout: pendingStatus } = await runGitCommand(["status", "--porcelain", "--", relativePath], state.rootPath);

  if (!pendingStatus.trim()) {
    return {
      committed: false,
      message: "No file changes were detected, so nothing was committed.",
      relativePath,
    };
  }

  await runGitCommand(["commit", "-m", message, "--", relativePath], state.rootPath);

  return {
    committed: true,
    message: `Committed ${relativePath} successfully.`,
    relativePath,
  };
});

ipcMain.handle("desktop:http-request", async (_event, payload) => {
  const url = typeof payload?.url === "string" ? payload.url : "";
  const method = typeof payload?.method === "string" ? payload.method : "GET";
  const headers = payload?.headers && typeof payload.headers === "object" ? payload.headers : {};
  const body = typeof payload?.body === "string" ? payload.body : undefined;

  if (!url) {
    return {
      ok: false,
      status: 400,
      headers: {},
      text: "Missing request URL",
    };
  }

  try {
    await writeDesktopLog(`HTTP ${method} ${url}`);
    const result = await new Promise((resolve, reject) => {
      const request = https.request(url, {
        method,
        headers,
      }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => {
          resolve({
            ok: (response.statusCode || 0) >= 200 && (response.statusCode || 0) < 300,
            status: response.statusCode || 0,
            headers: response.headers,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      });

      request.on("error", reject);

      if (body) {
        request.write(body);
      }

      request.end();
    });

    await writeDesktopLog(`HTTP ${method} ${url} -> ${result.status}`);
    return result;
  } catch (error) {
    await writeDesktopLog(`HTTP ${method} ${url} failed: ${error instanceof Error ? error.stack || error.message : String(error)}`);
    return {
      ok: false,
      status: 0,
      headers: {},
      text: error instanceof Error ? error.message : String(error),
    };
  }
});

app.whenReady().then(async () => {
  app.setAppUserModelId("com.psforge.desktop");
  createSplashWindow();
  await startLocalFrontendServer();
  createWindow();
  createTray();
  configureAutoUpdater();

  if (!isDev && app.isPackaged) {
    setTimeout(() => {
      checkForUpdates(false);
    }, 7000);

    updateCheckInterval = setInterval(() => {
      checkForUpdates(false);
    }, 4 * 60 * 60 * 1000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  if (appTray) {
    appTray.destroy();
    appTray = null;
  }
});

app.on("window-all-closed", () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }

  if (localServer) {
    localServer.close();
    localServer = null;
    localServerUrl = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});
