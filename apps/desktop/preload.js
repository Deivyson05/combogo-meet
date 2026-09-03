const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  async getDesktopSources() {
    return ipcRenderer.invoke("get-screen-sources");
  },
  writeClipboardText(text) {
    return ipcRenderer.invoke("write-clipboard-text", text);
  },
});
