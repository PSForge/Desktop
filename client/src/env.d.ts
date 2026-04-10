/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
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

interface Window {
  psforgeDesktop?: {
    getContext: () => Promise<{ isDesktop: boolean; platform: string; version: string }>;
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
    gitStatus: (payload: { repoPath: string }) => Promise<DesktopGitRepoState>;
    gitInit: (payload: { repoPath: string; branchName?: string }) => Promise<DesktopGitRepoState>;
    gitCreateBranch: (payload: { repoPath: string; branchName: string; fromBranch?: string }) => Promise<DesktopGitRepoState>;
    gitCheckout: (payload: { repoPath: string; branchName: string }) => Promise<DesktopGitRepoState>;
    gitCommitScript: (payload: { repoPath: string; relativePath: string; content: string; message: string }) => Promise<DesktopGitCommitResult>;
    getStorageItem: (key: string) => string | null;
    setStorageItem: (key: string, value: string) => boolean;
    removeStorageItem: (key: string) => boolean;
  };
}
