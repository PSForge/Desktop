import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("psforgeDesktop", {
  getContext: () => ipcRenderer.invoke("desktop:get-context"),
  getUpdateState: () => ipcRenderer.invoke("desktop:updates-get-state"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:updates-check"),
  installUpdate: () => ipcRenderer.invoke("desktop:updates-install"),
  onUpdateStatus: (callback: (payload: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
    ipcRenderer.on("desktop:update-status", listener);
    return () => {
      ipcRenderer.removeListener("desktop:update-status", listener);
    };
  },
  onMenuAction: (callback: (action: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on("desktop:menu-action", listener);
    return () => {
      ipcRenderer.removeListener("desktop:menu-action", listener);
    };
  },
  openScript: () => ipcRenderer.invoke("desktop:open-script"),
  saveScript: (payload: { content: string; defaultFileName?: string }) =>
    ipcRenderer.invoke("desktop:save-script", payload),
  writeScriptFile: (payload: { filePath: string; content: string }) =>
    ipcRenderer.invoke("desktop:write-script-file", payload),
  openDirectory: () => ipcRenderer.invoke("desktop:open-directory"),
  openPath: (targetPath: string) => ipcRenderer.invoke("desktop:open-path", targetPath),
  openExternal: (url: string) => ipcRenderer.invoke("desktop:open-external", url),
  request: (payload: { url: string; method?: string; headers?: Record<string, string>; body?: string }) =>
    ipcRenderer.invoke("desktop:http-request", payload),
  gitStatus: (payload: { repoPath: string }) => ipcRenderer.invoke("desktop:git-status", payload),
  gitInit: (payload: { repoPath: string; branchName?: string }) => ipcRenderer.invoke("desktop:git-init", payload),
  gitCreateBranch: (payload: { repoPath: string; branchName: string; fromBranch?: string }) =>
    ipcRenderer.invoke("desktop:git-create-branch", payload),
  gitCheckout: (payload: { repoPath: string; branchName: string }) => ipcRenderer.invoke("desktop:git-checkout", payload),
  gitCommitScript: (payload: { repoPath: string; relativePath: string; content: string; message: string }) =>
    ipcRenderer.invoke("desktop:git-commit-script", payload),
  getStorageItem: (key: string) => ipcRenderer.sendSync("desktop:storage-get", key),
  setStorageItem: (key: string, value: string) => ipcRenderer.sendSync("desktop:storage-set", { key, value }),
  removeStorageItem: (key: string) => ipcRenderer.sendSync("desktop:storage-remove", key),
});
