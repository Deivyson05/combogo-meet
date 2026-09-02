"use client";

import { useCallback, useRef, useState } from "react";
import { useNoiseSuppression } from "./useNoiseSuppression";
import { getScreenStream } from "./screenShareRepository";

export function useMediaStream() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
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

  /**
   * Liga/desliga a câmera. Ao desligar, chamamos track.stop() em vez de só
   * "enabled = false" — em vários navegadores mobile, deixar a track
   * desabilitada suspende o hardware da câmera e ela não volta sozinha com
   * "enabled = true". Ao religar, pedimos a câmera de novo com getUserMedia.
   *
   * Retorna a nova track (religando) ou null (desligando) — quem chama
   * repassa isso para peers.replaceCameraTrackForAll(...).
   */
  const toggleCamera = useCallback(async (): Promise<MediaStreamTrack | null> => {
    const currentTrack = rawStreamRef.current?.getVideoTracks()[0];

    if (currentTrack) {
      currentTrack.stop();
      rawStreamRef.current?.removeTrack(currentTrack);
      setLocalStream((prev) => {
        prev?.getVideoTracks().forEach((t) => prev.removeTrack(t));
        return prev;
      });
      setIsCameraOn(false);
      return null;
    }

    const fresh = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    const [newTrack] = fresh.getVideoTracks();

    rawStreamRef.current?.addTrack(newTrack);
    setLocalStream((prev) => {
      prev?.addTrack(newTrack);
      return prev;
    });

    setIsCameraOn(true);
    return newTrack;
  }, []);

  /** Retorna a track de tela — usePeerConnections decide como enviá-la (addScreenTrackForAll). */
    /** Agora usando o repository para decidir se é web ou Electron */
  const startScreenShare = useCallback(async (): Promise<MediaStreamTrack | null> => {
    const screenStream = await getScreenStream(); // chama o repository
    screenStreamRef.current = screenStream;
    setLocalScreenStream(screenStream);
    setIsSharingScreen(true);

    const [screenTrack] = screenStream.getVideoTracks();
    screenTrack.onended = () => {
      screenStreamRef.current = null;
      setLocalScreenStream(null);
      setIsSharingScreen(false);
    };
    return screenTrack;
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalScreenStream(null);
    setIsSharingScreen(false);
  }, []);

  const stopAll = useCallback(() => {
    rawStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cleanupNoise();
    setLocalStream(null);
    setLocalScreenStream(null);
  }, [cleanupNoise]);

  return {
    localStream,
    localScreenStream,
    isMicOn,
    isCameraOn,
    isSharingScreen,
    start,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    stopAll,
  };
}