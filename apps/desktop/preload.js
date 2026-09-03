const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  async getDesktopSources() {
    return ipcRenderer.invoke("get-screen-sources");
  },
  writeClipboardText(text) {
    return ipcRenderer.invoke("write-clipboard-text", text);
  },

  transcribeChunk(roomId, speakerName, audioBuffer) {
    return ipcRenderer.invoke("transcribe-chunk", roomId, speakerName, audioBuffer);
  },
  finalizeLocal(roomId) {
    return ipcRenderer.invoke("finalize-local", roomId);
  },
});