/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_PSFORGE_DESKTOP_ANALYTICS_KEY?: string;
  readonly VITE_PSFORGE_EDITION?: string;
  readonly VITE_PSFORGE_ENTERPRISE?: string;
  readonly VITE_PSFORGE_ENTERPRISE_LICENSE_URL?: string;
  readonly VITE_PSFORGE_WEB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface DesktopUpdateState {
  state: "idle" | "checking" | "available" | "up-to-date" | "downloading" | "downloaded" | "error";
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  message?: string;
  timestamp?: string;
}

interface DesktopScriptFileResult {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  content?: string;
}

interface DesktopDirectoryResult {
  canceled: boolean;
  filePath?: string;
}

interface DesktopGitChangedFile {
  path: string;
  status: string;
}

interface DesktopGitCommitEntry {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
}

interface DesktopGitRepoState {
  available: boolean;
  error?: string;
  repoPath: string;
  rootPath?: string | null;
  isRepo: boolean;
  currentBranch?: string | null;
  branches: string[];
  changedFiles: DesktopGitChangedFile[];
  recentCommits: DesktopGitCommitEntry[];
}

interface DesktopGitCommitResult {
  committed: boolean;
  message: string;
  relativePath: string;
}

interface DesktopPowerShellRunResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  transcriptPath?: string;
  transcriptContent?: string;
  runDirectory: string;
  shell: string;
  scriptPath: string;
  fileName: string;
  startedAt: string;
  finishedAt: string;
  elevated?: boolean;
  runMode?: "standard" | "dry-run" | "report-only";
}

interface Window {
  psforgeDesktop?: {
    getContext: () => Promise<{
      isDesktop: boolean;
      platform: string;
      version: string;
      osVersion?: string;
      edition?: "standard" | "enterprise";
      enterpriseInstallOptions?: {
        licenseKey?: string;
        licenseServerUrl?: string;
        silent?: boolean;
      };
    }>;
    getUpdateState: () => Promise<DesktopUpdateState>;
    checkForUpdates: () => Promise<DesktopUpdateState>;
    installUpdate: () => Promise<{ ok: boolean }>;
    onUpdateStatus: (callback: (payload: DesktopUpdateState) => void) => () => void;
    onMenuAction: (
      callback: (
        action:
          | "file:new"
          | "file:open"
          | "file:save"
          | "file:save-as"
          | "file:recent"
          | "settings:license"
          | "settings:subscription"
          | "settings:recovery"
          | "settings:check-updates",
      ) => void,
    ) => () => void;
    openScript: () => Promise<DesktopScriptFileResult>;
    saveScript: (payload: { content: string; defaultFileName?: string }) => Promise<DesktopScriptFileResult>;
    writeScriptFile: (payload: { filePath: string; content: string }) => Promise<DesktopScriptFileResult>;
    openDirectory: () => Promise<DesktopDirectoryResult>;
    openPath: (targetPath: string) => Promise<{ ok: boolean }>;
    openExternal: (url: string) => Promise<{ ok: boolean }>;
    request: (payload: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
      ok: boolean;
      status: number;
      headers: Record<string, string>;
      text: string;
    }>;
    debugLog: (message: string) => Promise<{ ok: boolean }>;
    gitStatus: (payload: { repoPath: string }) => Promise<DesktopGitRepoState>;
    gitInit: (payload: { repoPath: string; branchName?: string }) => Promise<DesktopGitRepoState>;
    gitCreateBranch: (payload: { repoPath: string; branchName: string; fromBranch?: string }) => Promise<DesktopGitRepoState>;
    gitCheckout: (payload: { repoPath: string; branchName: string }) => Promise<DesktopGitRepoState>;
    gitCommitScript: (payload: { repoPath: string; relativePath: string; content: string; message: string }) => Promise<DesktopGitCommitResult>;
    runPowerShellScript: (payload: {
      scriptContent: string;
      fileName?: string;
      parameters?: Record<string, unknown>;
      captureTranscript?: boolean;
      runAsAdmin?: boolean;
      runMode?: "standard" | "dry-run" | "report-only";
    }) => Promise<DesktopPowerShellRunResult>;
    zipDirectory: (payload: { sourceDirectory: string; archivePath: string }) => Promise<{ ok: boolean; archivePath: string }>;
    getStorageItem: (key: string) => string | null;
    setStorageItem: (key: string, value: string) => boolean;
    removeStorageItem: (key: string) => boolean;
  };
}
