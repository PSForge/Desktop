export interface DesktopContext {
  isDesktop: boolean;
  platform: string;
  version: string;
}

export interface DesktopScriptFile {
  canceled: boolean;
  filePath?: string;
  fileName?: string;
  content?: string;
}

export interface DesktopDirectoryResult {
  canceled: boolean;
  filePath?: string;
}

export interface DesktopGitChangedFile {
  path: string;
  status: string;
}

export interface DesktopGitCommitEntry {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
}

export interface DesktopGitRepoState {
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

export interface DesktopGitCommitResult {
  committed: boolean;
  message: string;
  relativePath: string;
}

export interface DesktopUpdateState {
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

export type DesktopMenuAction =
  | "file:new"
  | "file:open"
  | "file:save"
  | "file:save-as"
  | "file:recent"
  | "settings:license"
  | "settings:subscription"
  | "settings:recovery"
  | "settings:check-updates";

const desktopApi = () => window.psforgeDesktop;

export function isDesktopApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("desktop") === "1" || typeof desktopApi() !== "undefined";
}

export async function getDesktopContext(): Promise<DesktopContext | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.getContext();
}

export async function getDesktopUpdateState(): Promise<DesktopUpdateState | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.getUpdateState();
}

export async function checkForDesktopUpdates(): Promise<DesktopUpdateState | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.checkForUpdates();
}

export async function installDesktopUpdate() {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.installUpdate();
}

export function subscribeToDesktopUpdates(callback: (payload: DesktopUpdateState) => void) {
  if (!isDesktopApp()) {
    return () => undefined;
  }

  return desktopApi()!.onUpdateStatus(callback);
}

export function subscribeToDesktopMenuActions(callback: (action: DesktopMenuAction) => void) {
  if (!isDesktopApp() || typeof desktopApi()?.onMenuAction !== "function") {
    return () => undefined;
  }

  return desktopApi()!.onMenuAction(callback);
}

export async function openDesktopScript(): Promise<DesktopScriptFile | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.openScript();
}

export async function saveDesktopScript(content: string, defaultFileName?: string): Promise<DesktopScriptFile | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.saveScript({ content, defaultFileName });
}

export async function writeDesktopScriptFile(filePath: string, content: string): Promise<DesktopScriptFile | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.writeScriptFile({ filePath, content });
}

export async function openDesktopDirectory(): Promise<DesktopDirectoryResult | null> {
  if (!isDesktopApp()) {
    return null;
  }

  return desktopApi()!.openDirectory();
}

export async function openDesktopPath(targetPath: string) {
  if (!isDesktopApp()) {
    return;
  }

  await desktopApi()!.openPath(targetPath);
}

export async function openExternalUrl(url: string) {
  if (!isDesktopApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  await desktopApi()!.openExternal(url);
}

export function getDesktopStorageItem(key: string): string | null {
  if (!isDesktopApp()) {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  }

  return desktopApi()!.getStorageItem(key);
}

export function setDesktopStorageItem(key: string, value: string) {
  if (!isDesktopApp()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
    return;
  }

  desktopApi()!.setStorageItem(key, value);
}

export function removeDesktopStorageItem(key: string) {
  if (!isDesktopApp()) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    return;
  }

  desktopApi()!.removeStorageItem(key);
}

export async function getDesktopGitStatus(repoPath: string): Promise<DesktopGitRepoState> {
  return desktopApi()!.gitStatus({ repoPath });
}

export async function initializeDesktopGitRepo(repoPath: string, branchName?: string): Promise<DesktopGitRepoState> {
  return desktopApi()!.gitInit({ repoPath, branchName });
}

export async function createDesktopGitBranch(repoPath: string, branchName: string, fromBranch?: string): Promise<DesktopGitRepoState> {
  return desktopApi()!.gitCreateBranch({ repoPath, branchName, fromBranch });
}

export async function checkoutDesktopGitBranch(repoPath: string, branchName: string): Promise<DesktopGitRepoState> {
  return desktopApi()!.gitCheckout({ repoPath, branchName });
}

export async function commitDesktopGitScript(
  repoPath: string,
  relativePath: string,
  content: string,
  message: string,
): Promise<DesktopGitCommitResult> {
  return desktopApi()!.gitCommitScript({ repoPath, relativePath, content, message });
}
