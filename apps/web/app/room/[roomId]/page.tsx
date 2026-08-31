"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VideoTile } from "@/components/VideoTile";
import { CallControls } from "@/components/CallControls";
import { useMediaStream } from "@/hooks/useMediaStream";
import { usePeerConnections } from "@/hooks/usePeerConnections";
import { sendTranscriptionChunk, finalizeRoom } from "@/lib/api";

const CHUNK_INTERVAL_MS = 15_000;

type Presentation = { id: string; name: string; stream: MediaStream };

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHost = searchParams.get("host") === "1";

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const media = useMediaStream();
  const peers = usePeerConnections(roomId, displayName ?? "", media.localStream);

  const recorderRef = useRef<MediaRecorder | null>(null);

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

  const participants = Object.values(peers.remoteParticipants);

  // Todas as apresentações ativas: a sua (se estiver compartilhando) + a de
  // cada participante remoto que estiver compartilhando a tela.
  const presentations: Presentation[] = useMemo(() => {
    const list: Presentation[] = [];
    if (media.isSharingScreen && media.localScreenStream) {
      list.push({
        id: "local",
        name: `${displayName ?? "Você"} (você)`,
        stream: media.localScreenStream,
      });
    }
    participants.forEach((p) => {
      if (p.screenStream) list.push({ id: p.id, name: p.name, stream: p.screenStream });
    });
    return list;
  }, [media.isSharingScreen, media.localScreenStream, participants, displayName]);

  const presentationIds = presentations.map((p) => p.id).join(",");

  // Escolhe automaticamente a primeira apresentação pra destacar quando
  // surge uma nova, ou quando a que estava em destaque termina. O usuário
  // troca clicando em outra miniatura.
  useEffect(() => {
    if (presentations.length === 0) {
      setFocusedId(null);
      return;
    }
    setFocusedId((current) =>
      current && presentations.some((p) => p.id === current) ? current : presentations[0].id
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentationIds]);

  const focusedPresentation = presentations.find((p) => p.id === focusedId) ?? null;

  if (ended) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-white">A chamada terminou</h1>
          <p className="text-ink-500 dark:text-ink-400">
            A sala foi apagada. {downloadUrl ? "A transcrição está pronta:" : "Nenhum áudio foi transcrito."}
          </p>
        </div>
        {downloadUrl && (
          <a href={downloadUrl} className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600">
            Baixar transcrição (.docx)
          </a>
        )}
        <a href="/" className="text-sm text-ink-400 underline hover:text-ink-600">Voltar ao início</a>
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

      {focusedPresentation ? (
        <section className="flex flex-1 flex-col gap-3 py-4">
          <div className="min-h-0 flex-1">
            <VideoTile
              stream={focusedPresentation.stream}
              name={`${focusedPresentation.name} — apresentando`}
              className="h-full"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            <div className="w-36 shrink-0">
              <VideoTile stream={media.localStream} name={displayName ?? "Você"} isLocal micOn={media.isMicOn} small />
            </div>
            {participants.map((p) => (
              <div key={`cam-${p.id}`} className="w-36 shrink-0">
                <VideoTile stream={p.cameraStream} name={p.name} small />
              </div>
            ))}
            {presentations
              .filter((p) => p.id !== focusedId)
              .map((p) => (
                <button key={`screen-${p.id}`} onClick={() => setFocusedId(p.id)} className="w-36 shrink-0 text-left">
                  <VideoTile stream={p.stream} name={`${p.name} — apresentando`} small />
                </button>
              ))}
          </div>
        </section>
      ) : (
        <section className="grid flex-1 grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <VideoTile stream={media.localStream} name={displayName ?? "Você"} isLocal micOn={media.isMicOn} />
          {participants.map((p) => (
            <VideoTile key={p.id} stream={p.cameraStream} name={p.name} />
          ))}
        </section>
      )}

      <div className="sticky bottom-6 flex justify-center pb-6">
        <CallControls
          isMicOn={media.isMicOn}
          isCameraOn={media.isCameraOn}
          isSharingScreen={media.isSharingScreen}
          isHost={isHost}
          onToggleMic={media.toggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={handleLeave}
          onEndForAll={handleEndForAll}
        />
      </div>
    </main>
  );
}