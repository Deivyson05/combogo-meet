"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VideoTile } from "@/components/VideoTile";
import { CallControls } from "@/components/CallControls";
import { DesktopSourcePicker, MediaSettings } from "@/components/MediaSettings";
import { getDesktopSources, DesktopSource } from "@/hooks/screenShareRepository";
import { ChatPanel } from "@/components/ChatPanel";
import { useMediaStream } from "@/hooks/useMediaStream";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { sendTranscriptionChunk, finalizeRoom } from "@/lib/api";

const CHUNK_INTERVAL_MS = 15_000;

type Tile = {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal?: boolean;
  isPresentation?: boolean;
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "1";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [desktopSourcesOpen, setDesktopSourcesOpen] = useState(false);

  // ID do tile em destaque (ex: "local", "local-screen", peerId ou `${peerId}-screen`)
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const media = useMediaStream();
  const peers = usePeerConnections(roomId, displayName ?? "", media.localStream);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const participants = Object.values(peers.remoteParticipants);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevChatLengthRef = useRef(0);

  useEffect(() => {
    const delta = peers.chatMessages.length - prevChatLengthRef.current;
    if (delta > 0 && !isChatOpen) setUnreadCount((c) => c + delta);
    prevChatLengthRef.current = peers.chatMessages.length;
  }, [peers.chatMessages, isChatOpen]);

  function handleToggleChat() {
    setIsChatOpen((open) => {
      if (!open) setUnreadCount(0);
      return !open;
    });
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("combogo-display-name");
    if (stored) {
      setDisplayName(stored);
    } else {
      const typed = window.prompt("Digite seu nome para entrar na sala:");
      if (typed) {
        sessionStorage.setItem("combogo-display-name", typed);
        setDisplayName(typed);
      } else {
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (displayName) media.start();
    return () => media.stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  useEffect(() => {
    if (!media.localStream || !displayName) return;

    const audioOnly = new MediaStream(media.localStream.getAudioTracks());
    let intervalId: ReturnType<typeof setInterval>;
    let currentRecorder: MediaRecorder | null = null;

    const recordAndSendChunk = () => {
      const recorder = new MediaRecorder(audioOnly, { mimeType: "audio/webm" });
      currentRecorder = recorder;
      recorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        if (audioBlob.size > 0) sendTranscriptionChunk(roomId, displayName, audioBlob);
      };
      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, CHUNK_INTERVAL_MS);
    };

    recordAndSendChunk();
    intervalId = setInterval(recordAndSendChunk, CHUNK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (currentRecorder && currentRecorder.state === "recording") currentRecorder.stop();
    };
  }, [media.localStream, displayName, roomId]);

  useEffect(() => {
    if (peers.roomClosed) setEnded(true);
  }, [peers.roomClosed]);

  async function handleToggleCamera() {
    const track = await media.toggleCamera();
    peers.replaceCameraTrackForAll(track);
  }

  async function handleToggleScreenShare() {
    if (media.isSharingScreen) {
      media.stopScreenShare();
      peers.removeScreenTrackForAll();
    } else {
      try {
        const sources = await getDesktopSources();
        if (sources.length > 0) {
          setDesktopSourcesOpen(true);
          return;
        }
        const screenTrack = await media.startScreenShare();
        if (screenTrack) peers.addScreenTrackForAll(screenTrack);
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Não foi possível compartilhar a tela neste dispositivo."
        );
      }

    }
  }

  async function handleDesktopSource(source: DesktopSource) {
    setDesktopSourcesOpen(false);
    try {
      const screenTrack = await media.startScreenShare(source.id);
      if (screenTrack) peers.addScreenTrackForAll(screenTrack);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível compartilhar esta fonte.");
    }
  }

  async function handleLeave() {
    peers.leaveRoom();
    media.stopAll();
    router.push("/");
  }

  async function handleEndForAll() {
    const result = await finalizeRoom(roomId);
    setDownloadUrl(result.downloadUrl);
    setEnded(true);
    peers.leaveRoom();
    media.stopAll();
  }

  // Lista unificada de "tiles": câmera local, tela local (se compartilhando),
  // câmera de cada participante e a tela dele (se estiver apresentando).
  const tiles: Tile[] = useMemo(() => {
    const list: Tile[] = [
      { id: "local", name: displayName ?? "Você", stream: media.localStream, isLocal: true },
    ];
    if (media.isSharingScreen && media.localScreenStream) {
      list.push({
        id: "local-screen",
        name: `${displayName ?? "Você"} — apresentando`,
        stream: media.localScreenStream,
        isPresentation: true,
      });
    }
    participants.forEach((p) => {
      list.push({ id: p.id, name: p.name, stream: p.cameraStream });
      if (p.screenStream) {
        list.push({
          id: `${p.id}-screen`,
          name: `${p.name} — apresentando`,
          stream: p.screenStream,
          isPresentation: true,
        });
      }
    });
    return list;
  }, [displayName, media.localStream, media.isSharingScreen, media.localScreenStream, participants]);

  const presentationIds = tiles
    .filter((t) => t.isPresentation)
    .map((t) => t.id)
    .join(",");

  // Destaca automaticamente a primeira apresentação que aparecer (se nada
  // estiver fixado ainda), e desafixa se o que estava fixado sumiu.
  useEffect(() => {
    const presentations = tiles.filter((t) => t.isPresentation);
    setPinnedId((current) => {
      if (current && !tiles.some((t) => t.id === current)) {
        return presentations[0]?.id ?? null;
      }
      if (!current && presentations.length > 0) {
        return presentations[0].id;
      }
      return current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationIds]);

  if (ended) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-white">
            A chamada terminou
          </h1>
          <p className="text-ink-500 dark:text-ink-400">
            A sala foi apagada. {downloadUrl ? "A transcrição está pronta:" : "Nenhum áudio foi transcrito."}
          </p>
        </div>
        <a
          href={downloadUrl ?? "#"}
          className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
        >
          Baixar transcrição (.docx)
        </a>
        <a href="/" className="text-sm text-ink-400 underline hover:text-ink-600">
          Voltar ao início
        </a>
      </main>
    );
  }

  const pinnedTile = tiles.find((t) => t.id === pinnedId) ?? null;
  const hasPin = Boolean(pinnedTile);
  const galleryTiles = tiles.filter((t) => t.id !== pinnedId);

  return (
    <main className="flex min-h-screen flex-col px-6">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            {peers.connected ? `${participants.length + 1} na sala` : "Conectando..."}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LAYOUT DINÂMICO BASEADO NO PIN */}
        <section
          className={`flex flex-1 gap-4 py-4 ${hasPin ? "flex-col lg:flex-row" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
        >
          {/* ÁREA DE DESTAQUE */}
          {pinnedTile && (
            <div className="relative min-h-[50vh] flex-1 overflow-hidden rounded-2xl bg-ink-900/5 dark:bg-ink-900/20 lg:min-h-0">
              <VideoTile
                stream={pinnedTile.stream}
                name={pinnedTile.isLocal ? `${pinnedTile.name} (Fixado)` : `${pinnedTile.name} (Fixado)`}
                isLocal={pinnedTile.isLocal}
                micOn={pinnedTile.isLocal ? media.isMicOn : true}
                className="h-full w-full"
              />
              <button
                onClick={() => setPinnedId(null)}
                className="absolute top-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-md transition hover:bg-black"
              >
                Desafixar 📌
              </button>
            </div>
          )}

          {/* GALERIA LATERAL OU GRADE NORMAL */}
          <div
            className={
              hasPin
                ? "flex max-h-[25vh] shrink-0 flex-row gap-4 overflow-x-auto lg:max-h-none lg:w-72 lg:flex-col lg:overflow-y-auto"
                : "contents"
            }
          >
            {galleryTiles.map((t) => (
              <div key={t.id} className="group relative shrink-0">
                <VideoTile
                  stream={t.stream}
                  name={t.name}
                  isLocal={t.isLocal}
                  micOn={t.isLocal ? media.isMicOn : true}
                  className={hasPin ? "w-48 lg:w-full" : ""}
                />
                <button
                  onClick={() => setPinnedId(t.id)}
                  className="absolute top-2 right-2 rounded bg-black/50 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-black"
                  title="Fixar na tela principal"
                >
                  📌 Fixar
                </button>
              </div>
            ))}
          </div>
        </section>

        {isChatOpen && (
          <ChatPanel
            messages={peers.chatMessages}
            onSend={peers.sendChatMessage}
            onClose={() => setIsChatOpen(false)}
            localId={peers.localId}
          />
        )}
      </div>

      <div className="sticky bottom-6 flex justify-center pb-6">
        <CallControls
          isMicOn={media.isMicOn}
          isCameraOn={media.isCameraOn}
          isSharingScreen={media.isSharingScreen}
          isHost={isHost}
          isChatOpen={isChatOpen}
          unreadCount={unreadCount}
          onToggleMic={media.toggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onLeave={handleLeave}
          onEndForAll={handleEndForAll}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      {settingsOpen && (
        <MediaSettings
          audioInputId={media.audioInputId}
          videoInputId={media.videoInputId}
          onChange={media.changeDevices}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {desktopSourcesOpen && <DesktopSourcePicker onSelect={handleDesktopSource} onClose={() => setDesktopSourcesOpen(false)} />}
    </main>
  );
}