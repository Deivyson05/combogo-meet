export type DesktopSource = {
  id: string;
  name: string;
  thumbnail?: string;
};

type ElectronBridge = {
  getDesktopSources?: () => Promise<DesktopSource[]>;
  writeClipboardText?: (text: string) => Promise<void>;
};

function getElectronBridge(): ElectronBridge | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { electronAPI?: ElectronBridge }).electronAPI ?? null;
}

export async function getDesktopSources(): Promise<DesktopSource[]> {
  const bridge = getElectronBridge();
  if (!bridge?.getDesktopSources) return [];
  return bridge.getDesktopSources();
}

export async function copyText(text: string): Promise<void> {
  const bridge = getElectronBridge();
  if (bridge?.writeClipboardText) {
    await bridge.writeClipboardText(text);
    return;
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error("Não foi possível copiar o texto neste dispositivo.");
  }

  await navigator.clipboard.writeText(text);
}

export async function getScreenStream(sourceId?: string): Promise<MediaStream> {
  if (sourceId) {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // Electron Chromium requires these non-standard constraints.
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
        },
      } as MediaTrackConstraints,
    });
  }

  if (navigator.mediaDevices?.getDisplayMedia) {
    return navigator.mediaDevices.getDisplayMedia({ video: true });
  }

  throw new Error("Compartilhamento de tela não suportado neste ambiente");
}