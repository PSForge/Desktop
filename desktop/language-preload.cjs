const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("psforgeLanguagePrompt", {
  selectLanguage: (locale) => ipcRenderer.send("desktop:first-run-language-selected", locale),
});
