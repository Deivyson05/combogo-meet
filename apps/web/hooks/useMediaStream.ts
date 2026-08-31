"use client";

import { useCallback, useRef, useState } from "react";
import { useNoiseSuppression } from "./useNoiseSuppression";

export function useMediaStream() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const rawStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const { applyNoiseSuppression, cleanup: cleanupNoise } = useNoiseSuppression();

  const start = useCallback(async () => {
    const raw = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: false, // desligamos a nativa: RNNoise cuida disso
      },
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    rawStreamRef.current = raw;

    const cleaned = await applyNoiseSuppression(raw);
    setLocalStream(cleaned);
    return cleaned;
  }, [applyNoiseSuppression]);

  const toggleMic = useCallback(() => {
    const track = rawStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = rawStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
  }, []);

  /** Retorna a track de tela — quem consome (usePeerConnections) decide como substituir a track de vídeo em cada conexão. */
  const startScreenShare = useCallback(async (): Promise<MediaStreamTrack | null> => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    });
    screenStreamRef.current = screenStream;
    setIsSharingScreen(true);

    const [screenTrack] = screenStream.getVideoTracks();
    screenTrack.onended = () => setIsSharingScreen(false);
    return screenTrack;
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);
  }, []);

  const stopAll = useCallback(() => {
    rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cleanupNoise();
    setLocalStream(null);
  }, [cleanupNoise]);

  return {
    localStream,
    isMicOn,
    isCameraOn,
    isSharingScreen,
    start,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    stopAll,
    cameraTrack: () => rawStreamRef.current?.getVideoTracks()[0] ?? null,
  };
}
