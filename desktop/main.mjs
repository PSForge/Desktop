import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, shell } from "electron";
import { execFile } from "node:child_process";
import electronUpdater from "electron-updater";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const isDev = !app.isPackaged;
const devServerUrl = process.env.PSFORGE_DESKTOP_URL || "http://127.0.0.1:5173";
const execFileAsync = promisify(execFile);
const { autoUpdater } = electronUpdater;
const appUserModelId = "com.isaiahblacknall.psforge.desktop";
const desktopEdition = process.env.PSFORGE_EDITION === "enterprise" || app.getName().toLowerCase().includes("enterprise")
  ? "enterprise"
  : "standard";
const desktopUpdateFeedUrl = desktopEdition === "enterprise"
  ? "https://www.psforge.app/api/desktop/enterprise-updates"
  : "https://www.psforge.app/api/desktop/updates";

app.setAppUserModelId(appUserModelId);

let mainWindow = null;
let splashWindow = null;
let localServer = null;
let localServerUrl = null;
let gitExecutablePath = null;
let powerShellExecutablePath = null;
let isQuitting = false;
let updateCheckInterval = null;
let latestUpdateStatus = { state: "idle" };

function readCommandLineValue(names) {
  for (const rawArg of process.argv.slice(1)) {
    const arg = String(rawArg || "").trim();
    for (const name of names) {
      const normalizedName = name.toLowerCase();
      const normalizedArg = arg.toLowerCase();
      if (normalizedArg === normalizedName) {
        return "true";
      }
      if (normalizedArg.startsWith(`${normalizedName}=`)) {
        return arg.slice(name.length + 1).replace(/^"|"$/g, "");
      }
      if (normalizedArg.startsWith(`${normalizedName}:`)) {
        return arg.slice(name.length + 1).replace(/^"|"$/g, "");
      }
    }
  }

  return null;
}

async function readRegistryValue(root, keyPath, valueName) {
  try {
    const { stdout } = await execFileAsync("reg.exe", ["query", `${root}\\${keyPath}`, "/v", valueName], {
      windowsHide: true,
    });
    const line = stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.toLowerCase().startsWith(valueName.toLowerCase()));

    if (!line) {
      return null;
    }

    const parts = line.split(/\s{2,}/);
    return parts.length >= 3 ? parts.slice(2).join(" ").trim() : null;
  } catch {
    return null;
  }
}

function readEnterpriseConfigFile() {
  const candidates = [
    path.join(process.env.ProgramData || "C:\\ProgramData", "PSForge", "Enterprise", "activation.json"),
    path.join(app.getPath("userData"), "enterprise-activation.json"),
  ];

  for (const candidate of candidates) {
    try {
      if (!fsSync.existsSync(candidate)) {
        continue;
      }

      const parsed = JSON.parse(fsSync.readFileSync(candidate, "utf8"));
      return {
        licenseKey: typeof parsed.licenseKey === "string" ? parsed.licenseKey : undefined,
        licenseServerUrl: typeof parsed.licenseServerUrl === "string" ? parsed.licenseServerUrl : undefined,
        silent: parsed.silent === true,
      };
    } catch {
      // Ignore malformed deployment config files and continue to other sources.
    }
  }

  return {};
}

async function readEnterpriseRegistryOptions() {
  const keyPath = "Software\\PSForge\\Enterprise";
  const [hklmLicenseKey, hkcuLicenseKey, hklmLicenseServer, hkcuLicenseServer, hklmSilent, hkcuSilent] = await Promise.all([
    readRegistryValue("HKLM", keyPath, "LicenseKey"),
    readRegistryValue("HKCU", keyPath, "LicenseKey"),
    readRegistryValue("HKLM", keyPath, "LicenseServerUrl"),
    readRegistryValue("HKCU", keyPath, "LicenseServerUrl"),
    readRegistryValue("HKLM", keyPath, "Silent"),
    readRegistryValue("HKCU", keyPath, "Silent"),
  ]);

  return {
    licenseKey: hkcuLicenseKey || hklmLicenseKey || undefined,
    licenseServerUrl: hkcuLicenseServer || hklmLicenseServer || undefined,
    silent: (hkcuSilent || hklmSilent || "").toLowerCase() === "true" || (hkcuSilent || hklmSilent || "") === "1",
  };
}

async function getEnterpriseInstallOptions() {
  if (desktopEdition !== "enterprise") {
    return undefined;
  }

  const fileOptions = readEnterpriseConfigFile();
  const registryOptions = await readEnterpriseRegistryOptions();
  const licenseKey = process.env.PSFORGE_ENTERPRISE_LICENSE_KEY
    || readCommandLineValue([
      "--enterprise-license-key",
      "--psforge-license-key",
      "/enterpriseLicenseKey",
      "/psforgeLicenseKey",
    ])
    || fileOptions.licenseKey
    || registryOptions.licenseKey;
  const licenseServerUrl = process.env.PSFORGE_ENTERPRISE_LICENSE_URL
    || readCommandLineValue([
      "--enterprise-license-server",
      "--psforge-license-server",
      "/enterpriseLicenseServer",
      "/psforgeLicenseServer",
    ])
    || fileOptions.licenseServerUrl
    || registryOptions.licenseServerUrl;
  const silent = readCommandLineValue(["--enterprise-silent", "/enterpriseSilent"]) === "true"
    || fileOptions.silent === true
    || registryOptions.silent === true;

  return {
    ...(licenseKey ? { licenseKey } : {}),
    ...(licenseServerUrl ? { licenseServerUrl } : {}),
    silent,
  };
}

function updateSplashProgress(percent, message = "Loading PSForge Desktop...") {
  if (!splashWindow || splashWindow.isDestroyed()) {
    return;
  }

  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const serializedMessage = JSON.stringify(message);
  splashWindow.webContents
    .executeJavaScript(`window.__setSplashProgress?.(${clampedPercent}, ${serializedMessage});`, true)
    .catch(() => {
      // Ignore timing issues if the splash content has not finished loading yet.
    });
}

function sendMenuAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("desktop:menu-action", action);
  }
}

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

process.on("uncaughtExceptionMonitor", (error, origin) => {
  void writeDesktopLog(`[main-uncaught-exception] origin=${origin} ${error?.stack || error?.message || error}`);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  void writeDesktopLog(`[main-unhandled-rejection] ${message}`);
});

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

function getWindowIcon() {
  const icon = nativeImage.createFromPath(getWindowIconPath());
  return icon.isEmpty() ? getWindowIconPath() : icon;
}

function getSplashImagePath() {
  if (isDev) {
    return path.join(appRoot, "build", "loading-screen.jpg");
  }

  return path.join(process.resourcesPath, "branding", "loading-screen.jpg");
}

function getSplashImageDataUrl() {
  try {
    const splashPath = getSplashImagePath();
    const extension = path.extname(splashPath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
    const buffer = fsSync.readFileSync(splashPath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    writeDesktopLog(`Failed to read splash image: ${error?.message || error}`);
    return null;
  }
}

function createSplashWindow() {
  const splashImageUrl = getSplashImageDataUrl();
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
    icon: getWindowIcon(),
    webPreferences: {
      contextIsolation: true,
      sandbox: false,
    },
  });

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
    updateSplashProgress(8, "Starting PSForge Desktop...");
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
              position: relative;
              display: grid;
              place-items: center;
              font-family: Segoe UI, Arial, sans-serif;
              color: #f8fafc;
            }

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              user-select: none;
              -webkit-user-drag: none;
            }

            .image-fallback {
              position: absolute;
              inset: 0;
              display: none;
              place-items: center;
              padding: 32px;
              text-align: center;
              background: radial-gradient(circle at top, rgba(96, 165, 250, 0.25), rgba(21, 80, 166, 0.95) 55%);
            }

            .image-fallback.visible {
              display: grid;
            }

            .fallback-title {
              font-size: 48px;
              font-weight: 800;
              letter-spacing: -0.03em;
              text-shadow: 0 10px 30px rgba(15, 23, 42, 0.45);
            }

            .fallback-subtitle {
              margin-top: 12px;
              font-size: 16px;
              color: rgba(248, 250, 252, 0.8);
            }

            .overlay {
              position: absolute;
              left: 50%;
              bottom: 32px;
              width: min(440px, calc(100% - 64px));
              transform: translateX(-50%);
            }

            .status-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 10px;
              text-shadow: 0 2px 12px rgba(15, 23, 42, 0.65);
            }

            .status-label {
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 0.01em;
            }

            .status-percent {
              font-size: 14px;
              font-weight: 700;
            }

            .track {
              height: 12px;
              overflow: hidden;
              border-radius: 999px;
              background: rgba(15, 23, 42, 0.28);
              box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
              backdrop-filter: blur(8px);
            }

            .bar {
              height: 100%;
              width: 0%;
              border-radius: inherit;
              background: linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%);
              box-shadow: 0 0 18px rgba(96, 165, 250, 0.45);
              transition: width 180ms ease;
            }
          </style>
        </head>
        <body>
          ${splashImageUrl ? `<img id="splash-image" src="${splashImageUrl}" alt="PSForge loading screen" />` : ""}
          <div id="image-fallback" class="image-fallback${splashImageUrl ? "" : " visible"}" aria-hidden="${splashImageUrl ? "true" : "false"}">
            <div>
              <div class="fallback-title">PSForge</div>
              <div class="fallback-subtitle">PowerShell Automation Workspace for Windows</div>
            </div>
          </div>
          <div class="overlay" aria-live="polite">
            <div class="status-row">
              <div class="status-label" id="status-label">Starting PSForge Desktop...</div>
              <div class="status-percent" id="status-percent">0%</div>
            </div>
            <div class="track">
              <div class="bar" id="status-bar"></div>
            </div>
          </div>
          <script>
            const splashImage = document.getElementById("splash-image");
            const imageFallback = document.getElementById("image-fallback");

            if (splashImage && imageFallback) {
              splashImage.addEventListener("error", () => {
                imageFallback.classList.add("visible");
                imageFallback.setAttribute("aria-hidden", "false");
              });
            }

            window.__setSplashProgress = (percent, message) => {
              const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
              const label = document.getElementById("status-label");
              const percentNode = document.getElementById("status-percent");
              const bar = document.getElementById("status-bar");

              if (label) {
                label.textContent = message || "Loading PSForge Desktop...";
              }

              if (percentNode) {
                percentNode.textContent = safePercent + "%";
              }

              if (bar) {
                bar.style.width = safePercent + "%";
              }
            };
          </script>
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

async function findPowerShellExecutable() {
  if (powerShellExecutablePath) {
    return powerShellExecutablePath;
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["pwsh"], { windowsHide: true });
    const match = stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && fsSync.existsSync(entry));

    if (match) {
      powerShellExecutablePath = match;
      return powerShellExecutablePath;
    }
  } catch {
    // Fall back to common install locations below.
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["powershell"], { windowsHide: true });
    const match = stdout
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && fsSync.existsSync(entry));

    if (match) {
      powerShellExecutablePath = match;
      return powerShellExecutablePath;
    }
  } catch {
    // Fall back to common install locations below.
  }

  const candidates = [
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "PowerShell", "7", "pwsh.exe"),
    path.join(process.env["ProgramFiles"] || "C:\\Program Files", "PowerShell", "6", "pwsh.exe"),
    path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
  ].filter(Boolean);

  const found = candidates.find((candidate) => fsSync.existsSync(candidate));
  powerShellExecutablePath = found || null;
  return powerShellExecutablePath;
}

function toPowerShellLiteral(value) {
  if (value == null) {
    return "$null";
  }

  if (Array.isArray(value)) {
    return `@(${value.map((entry) => toPowerShellLiteral(entry)).join(", ")})`;
  }

  if (typeof value === "boolean") {
    return value ? "$true" : "$false";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sanitizeFileName(value, fallback = "script.ps1") {
  const nextValue = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const sanitized = nextValue.replace(/[<>:"/\\|?*]+/g, "-");
  return sanitized || fallback;
}

async function zipDirectoryToArchive(sourceDirectory, archivePath) {
  const powerShellPath = await findPowerShellExecutable();
  if (!powerShellPath) {
    throw new Error("PowerShell was not found on this computer. Install PowerShell 7 or enable Windows PowerShell.");
  }

  const zipScript = [
    `$sourceDirectory = ${toPowerShellLiteral(sourceDirectory)}`,
    `$archivePath = ${toPowerShellLiteral(archivePath)}`,
    "if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }",
    "Compress-Archive -LiteralPath $sourceDirectory -DestinationPath $archivePath -Force",
    "",
  ].join("\r\n");

  const zipScriptPath = path.join(app.getPath("userData"), "temp", `zip-${Date.now()}.ps1`);
  await fs.mkdir(path.dirname(zipScriptPath), { recursive: true });
  await fs.writeFile(zipScriptPath, zipScript, "utf8");
  await execFileAsync(powerShellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", zipScriptPath], {
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function runDesktopPowerShellScript({ scriptContent, fileName, parameters, captureTranscript = true, runAsAdmin = false, runMode = "standard" }) {
  const powerShellPath = await findPowerShellExecutable();
  if (!powerShellPath) {
    throw new Error("PowerShell was not found on this computer. Install PowerShell 7 or enable Windows PowerShell.");
  }

  const startedAt = new Date().toISOString();
  const runDirectory = path.join(app.getPath("userData"), "runs", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const safeFileName = sanitizeFileName(fileName || "psforge-script.ps1");
  const scriptPath = path.join(runDirectory, safeFileName.endsWith(".ps1") ? safeFileName : `${safeFileName}.ps1`);
  const transcriptPath = path.join(runDirectory, `${safeFileName.replace(/\.ps1$/i, "")}-transcript.txt`);
  const wrapperPath = path.join(runDirectory, "run-wrapper.ps1");
  const launcherPath = path.join(runDirectory, "run-launcher.ps1");
  const stdoutPath = path.join(runDirectory, "stdout.txt");
  const stderrPath = path.join(runDirectory, "stderr.txt");
  const parameterEntries = Object.entries(parameters || {});
  const parameterLiteral = parameterEntries.length > 0
    ? parameterEntries.map(([key, value]) => `  ${key} = ${toPowerShellLiteral(value)}`).join(";\n")
    : "";

  const wrapperScript = [
    "$ErrorActionPreference = 'Continue'",
    runMode === "dry-run" || runMode === "report-only" ? "$WhatIfPreference = $true" : "",
    runMode === "dry-run" || runMode === "report-only" ? "$PSDefaultParameterValues['*:WhatIf'] = $true" : "",
    runMode === "report-only" ? "$VerbosePreference = 'Continue'" : "",
    runMode === "report-only" ? "$InformationPreference = 'Continue'" : "",
    `$scriptPath = ${toPowerShellLiteral(scriptPath)}`,
    `$captureTranscript = ${captureTranscript ? "$true" : "$false"}`,
    captureTranscript ? `$transcriptPath = ${toPowerShellLiteral(transcriptPath)}` : "$transcriptPath = $null",
    "$invokeParams = @{}",
    parameterLiteral ? `$invokeParams = @{\n${parameterLiteral}\n}` : "",
    "if ($captureTranscript -and $transcriptPath) { Start-Transcript -Path $transcriptPath -Force | Out-Null }",
    "try {",
    "  & $scriptPath @invokeParams",
    "  if ($LASTEXITCODE -ne $null) { $exitCode = [int]$LASTEXITCODE } else { $exitCode = 0 }",
    "} catch {",
    "  Write-Error $_",
    "  $exitCode = 1",
    "} finally {",
    "  if ($captureTranscript -and $transcriptPath) { try { Stop-Transcript | Out-Null } catch {} }",
    "}",
    "exit $exitCode",
    "",
  ].filter(Boolean).join("\r\n");

  await fs.mkdir(runDirectory, { recursive: true });
  await fs.writeFile(scriptPath, scriptContent || "", "utf8");
  await fs.writeFile(wrapperPath, wrapperScript, "utf8");
  await writeDesktopLog(`powershell run start [shell=${powerShellPath}] [script=${scriptPath}] [elevated=${runAsAdmin}] [mode=${runMode}]`);

  if (runAsAdmin) {
    const launcherScript = [
      `$scriptShell = ${toPowerShellLiteral(powerShellPath)}`,
      `$wrapperPath = ${toPowerShellLiteral(wrapperPath)}`,
      `$stdoutPath = ${toPowerShellLiteral(stdoutPath)}`,
      `$stderrPath = ${toPowerShellLiteral(stderrPath)}`,
      "$argumentList = @(",
      "  '-NoProfile',",
      "  '-ExecutionPolicy',",
      "  'Bypass',",
      "  '-File',",
      "  $wrapperPath",
      ")",
      "$process = Start-Process -FilePath $scriptShell -Verb RunAs -ArgumentList $argumentList -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath",
      "exit $process.ExitCode",
      "",
    ].join("\r\n");
    await fs.writeFile(launcherPath, launcherScript, "utf8");
  }

  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  try {
    const targetScript = runAsAdmin ? launcherPath : wrapperPath;
    const result = await execFileAsync(powerShellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", targetScript], {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout?.trim() || "";
    stderr = result.stderr?.trim() || "";
  } catch (error) {
    stdout = error?.stdout?.trim() || "";
    stderr = error?.stderr?.trim() || error?.message || "PowerShell execution failed.";
    exitCode = typeof error?.code === "number" ? error.code : 1;
  }

  if (runAsAdmin) {
    stdout = fsSync.existsSync(stdoutPath) ? (await fs.readFile(stdoutPath, "utf8")).trim() : stdout;
    stderr = fsSync.existsSync(stderrPath) ? (await fs.readFile(stderrPath, "utf8")).trim() : stderr;
  }

  const transcriptContent = captureTranscript && fsSync.existsSync(transcriptPath)
    ? await fs.readFile(transcriptPath, "utf8")
    : "";
  const finishedAt = new Date().toISOString();
  await writeDesktopLog(`powershell run finish [exit=${exitCode}] [transcript=${captureTranscript ? transcriptPath : "disabled"}] [elevated=${runAsAdmin}] [mode=${runMode}]`);

  return {
    ok: exitCode === 0,
    exitCode,
    stdout,
    stderr,
    transcriptPath: captureTranscript ? transcriptPath : undefined,
    transcriptContent,
    runDirectory,
    shell: path.basename(powerShellPath),
    scriptPath,
    fileName: path.basename(scriptPath),
    startedAt,
    finishedAt,
    elevated: runAsAdmin,
    runMode,
  };
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
  updateSplashProgress(76, "Opening desktop workspace...");

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#0b1220",
    autoHideMenuBar: false,
    show: false,
    icon: getWindowIcon(),
    title: "PSForge Desktop",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setIcon(getWindowIcon());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    void writeDesktopLog(`[renderer-console:${level}] ${sourceId || "unknown"}:${line} ${message}`);
  });

  mainWindow.webContents.on("did-start-loading", () => {
    updateSplashProgress(86, "Loading workspace interface...");
  });

  mainWindow.webContents.on("dom-ready", () => {
    updateSplashProgress(95, "Finalizing workspace...");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    updateSplashProgress(100, "Workspace ready");
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    void writeDesktopLog(`[renderer-load-failed] code=${errorCode} url=${validatedURL} message=${errorDescription}`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    void writeDesktopLog(`[renderer-gone] reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on("unresponsive", () => {
    void writeDesktopLog("[renderer-unresponsive]");
  });

  mainWindow.webContents.on("responsive", () => {
    void writeDesktopLog("[renderer-responsive]");
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
    updateSplashProgress(100, "Workspace ready");
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
        mainWindow.maximize();
      }

      mainWindow?.show();
      if (latestUpdateStatus.state !== "idle") {
        mainWindow?.webContents.send("desktop:update-status", latestUpdateStatus);
      }
    }, 180);
  });

  mainWindow.loadURL(withDesktopFlag(isDev ? devServerUrl : localServerUrl));
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isMaximized()) {
    mainWindow.maximize();
  }
  mainWindow.show();
  mainWindow.focus();
}

function createApplicationMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            {
              label: "Quit PSForge",
              accelerator: "CmdOrCtrl+Q",
              click: () => {
                isQuitting = true;
                app.quit();
              },
            },
          ],
        }]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Script",
          accelerator: "CmdOrCtrl+N",
          click: () => sendMenuAction("file:new"),
        },
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click: () => sendMenuAction("file:open"),
        },
        {
          label: "Save Local",
          accelerator: "CmdOrCtrl+S",
          click: () => sendMenuAction("file:save"),
        },
        {
          label: "Save As",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendMenuAction("file:save-as"),
        },
        { type: "separator" },
        {
          label: "Recent Files",
          click: () => sendMenuAction("file:recent"),
        },
        ...(isMac ? [] : [{ type: "separator" }, { role: "quit", label: "Exit" }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ type: "separator" }, { role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" },
      ],
    },
    {
      label: "App Settings",
      submenu: [
        {
          label: "Account & License",
          click: () => sendMenuAction("settings:license"),
        },
        {
          label: "Subscription & Billing",
          click: () => sendMenuAction("settings:subscription"),
        },
        {
          label: "Workspace Recovery",
          click: () => sendMenuAction("settings:recovery"),
        },
        { type: "separator" },
        {
          label: "Check for Updates",
          click: () => sendMenuAction("settings:check-updates"),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "PSForge Website",
          click: () => shell.openExternal("https://www.psforge.app"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  osVersion: os.release(),
  edition: desktopEdition,
  enterpriseInstallOptions: await getEnterpriseInstallOptions(),
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

ipcMain.handle("desktop:run-powershell-script", async (_event, payload) => {
  const scriptContent = typeof payload?.scriptContent === "string" ? payload.scriptContent : "";
  if (!scriptContent.trim()) {
    throw new Error("Add script content before starting a desktop PowerShell run.");
  }

  return runDesktopPowerShellScript({
    scriptContent,
    fileName: typeof payload?.fileName === "string" ? payload.fileName : "psforge-script.ps1",
    parameters: payload?.parameters && typeof payload.parameters === "object" ? payload.parameters : {},
    captureTranscript: payload?.captureTranscript !== false,
    runAsAdmin: payload?.runAsAdmin === true,
    runMode: payload?.runMode === "dry-run" || payload?.runMode === "report-only" ? payload.runMode : "standard",
  });
});

ipcMain.handle("desktop:zip-directory", async (_event, payload) => {
  const sourceDirectory = typeof payload?.sourceDirectory === "string" ? payload.sourceDirectory.trim() : "";
  const archivePath = typeof payload?.archivePath === "string" ? payload.archivePath.trim() : "";

  if (!sourceDirectory || !archivePath) {
    throw new Error("A source directory and destination archive path are required.");
  }

  await zipDirectoryToArchive(sourceDirectory, archivePath);
  return {
    ok: true,
    archivePath,
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
      const requestClient = url.startsWith("http://") ? http : https;
      const request = requestClient.request(url, {
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

ipcMain.handle("desktop:debug-log", async (_event, message) => {
  if (typeof message === "string" && message.trim()) {
    await writeDesktopLog(`[renderer] ${message.trim()}`);
  }

  return { ok: true };
});

app.whenReady().then(async () => {
  createSplashWindow();
  updateSplashProgress(12, "Starting local workspace services...");
  await startLocalFrontendServer();
  updateSplashProgress(58, "Preparing desktop features...");
  createApplicationMenu();
  updateSplashProgress(68, "Building desktop menu...");
  createWindow();
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
