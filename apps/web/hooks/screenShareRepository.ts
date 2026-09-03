export type DesktopSource = {
  id: string;
  name: string;
  thumbnail?: string;
};

type ElectronBridge = {
  isElectron?: boolean;
  getDesktopSources?: () => Promise<DesktopSource[]>;
  writeClipboardText?: (text: string) => Promise<void>;
  transcribeChunk?: (
    roomId: string,
    speakerName: string,
    audioBuffer: ArrayBuffer
  ) => Promise<void>;
  finalizeLocal?: (roomId: string) => Promise<{ saved: boolean; path?: string }>;
};

function getElectronBridge(): ElectronBridge | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { electronAPI?: ElectronBridge }).electronAPI ?? null;
}

export function isElectronDesktop(): boolean {
  return Boolean(getElectronBridge()?.isElectron);
}

export async function transcribeChunkInDesktop(
  roomId: string,
  speakerName: string,
  audioBlob: Blob
): Promise<boolean> {
  const bridge = getElectronBridge();
  if (!bridge?.transcribeChunk) return false;

  await bridge.transcribeChunk(roomId, speakerName, await audioBlob.arrayBuffer());
  return true;
}

export async function finalizeLocalTranscript(
  roomId: string
): Promise<{ saved: boolean; path?: string } | null> {
  const bridge = getElectronBridge();
  if (!bridge?.finalizeLocal) return null;
  return bridge.finalizeLocal(roomId);
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