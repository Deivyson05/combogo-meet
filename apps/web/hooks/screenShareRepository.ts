export async function getScreenStream(): Promise<MediaStream> {
  // Fluxo Web (navegador)
  if (navigator.mediaDevices?.getDisplayMedia) {
    return await navigator.mediaDevices.getDisplayMedia({ video: true });
  }

  // Fluxo Electron
  if (typeof window !== "undefined" && (window as any).process?.type) {
    // Import dinâmico para evitar erro em projetos com "type: module"
    const electron = await import("electron");
    const { desktopCapturer } = electron;

    const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });

    // Aqui você pode criar uma UI para o usuário escolher a tela/janela
    const selectedSource = sources[0];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: selectedSource.id,
        },
      } as any, // "mandatory" não existe no tipo oficial, então usamos `as any`
    });

    return stream;
  }

  throw new Error("Compartilhamento de tela não suportado neste ambiente");
}