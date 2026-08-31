"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VideoTile } from "@/components/VideoTile";
import { CallControls } from "@/components/CallControls";
import { useMediaStream } from "@/hooks/useMediaStream";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { sendTranscriptionChunk, finalizeRoom } from "@/lib/api";

const CHUNK_INTERVAL_MS = 15_000;

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "1";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const media = useMediaStream();
  const peers = usePeerConnections(roomId, displayName ?? "", media.localStream);

  const recorderRef = useRef<MediaRecorder | null>(null);

  const participants = Object.values(peers.remoteParticipants);
  const remotePresenter = participants.find((p) => p.isSharingScreen);
  const isSomeonePresenting = media.isSharingScreen || !!remotePresenter;
  const galleryParticipants = participants.filter((p) => !p.isSharingScreen);

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
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          sendTranscriptionChunk(roomId, displayName, audioBlob);
        }
      };

      recorder.start();

      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, CHUNK_INTERVAL_MS);
    };

    recordAndSendChunk();
    intervalId = setInterval(recordAndSendChunk, CHUNK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (currentRecorder && currentRecorder.state === "recording") {
        currentRecorder.stop();
      }
    };
  }, [media.localStream, displayName, roomId]);

  useEffect(() => {
    if (peers.roomClosed) setEnded(true);
  }, [peers.roomClosed]);

  async function handleToggleScreenShare() {
    if (media.isSharingScreen) {
      media.stopScreenShare();
      const camTrack = media.cameraTrack();
      if (camTrack) peers.replaceVideoTrackForAll(camTrack);

      peers.broadcastScreenState(false);
    } else {
      const screenTrack = await media.startScreenShare();
      if (screenTrack) peers.replaceVideoTrackForAll(screenTrack);

      peers.broadcastScreenState(true);
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
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            Baixar transcrição (.docx)
          </a>
        )}
        <a href="/" className="text-sm text-ink-400 underline hover:text-ink-600">
          Voltar ao início
        </a>
      </main>
    );
  }

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

      <section
        className={`flex-1 py-4 flex gap-4 ${
          isSomeonePresenting ? "flex-col lg:flex-row" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {isSomeonePresenting && (
          <div className="flex-1 bg-ink-900/5 dark:bg-ink-900/20 rounded-2xl overflow-hidden min-h-[50vh] lg:min-h-0">
            {media.isSharingScreen ? (
              <div className="flex h-full flex-col items-center justify-center text-center p-6">
                <span className="text-4xl mb-4">🖥️</span>
                <h3 className="text-xl font-medium text-ink-900 dark:text-white">Você está apresentando</h3>
                <p className="text-ink-500">Sua tela está visível para todos na sala.</p>
              </div>
            ) : (
              remotePresenter && (
                <VideoTile
                  stream={remotePresenter.stream}
                  name={`${remotePresenter.name} (Apresentação)`}
                  className="h-full w-full object-contain"
                />
              )
            )}
          </div>
        )}

        <div
          className={
            isSomeonePresenting
              ? "flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:w-72 max-h-[25vh] lg:max-h-none shrink-0"
              : "contents"
          }
        >
          {(!media.isSharingScreen || !isSomeonePresenting) && (
            <VideoTile
              stream={media.localStream}
              name={displayName ?? "Você"}
              isLocal
              micOn={media.isMicOn}
              className={isSomeonePresenting ? "w-48 lg:w-full shrink-0" : ""}
            />
          )}

          {galleryParticipants.map((p) => (
            <VideoTile
              key={p.id}
              stream={p.stream}
              name={p.name}
              className={isSomeonePresenting ? "w-48 lg:w-full shrink-0" : ""}
            />
          ))}
        </div>
      </section>

      <div className="sticky bottom-6 flex justify-center pb-6">
        <CallControls
          isMicOn={media.isMicOn}
          isCameraOn={media.isCameraOn}
          isSharingScreen={media.isSharingScreen}
          isHost={isHost}
          onToggleMic={media.toggleMic}
          onToggleCamera={media.toggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={handleLeave}
          onEndForAll={handleEndForAll}
        />
      </div>
    </main>
  );
}