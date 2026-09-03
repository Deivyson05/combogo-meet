const { contextBridge, desktopCapturer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  async getDesktopSources() {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  },
});
