"use client";

import { useCallback, useRef } from "react";

/**
 * Aplica supressão de ruído (RNNoise, ver public/worklets/rnnoise-processor.js)
 * em um MediaStream de áudio e devolve um novo MediaStream já processado,
 * pronto para ser usado como a track de áudio enviada via WebRTC.
 */
export function useNoiseSuppression() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const applyNoiseSuppression = useCallback(
    async (inputStream: MediaStream): Promise<MediaStream> => {
      const audioTrack = inputStream.getAudioTracks()[0];
      if (!audioTrack) return inputStream;

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/worklets/rnnoise-processor.bundle.js");

      const source = audioContext.createMediaStreamSource(
        new MediaStream([audioTrack])
      );
      const rnnoiseNode = new AudioWorkletNode(audioContext, "rnnoise-processor");
      const destination = audioContext.createMediaStreamDestination();

      source.connect(rnnoiseNode).connect(destination);

      const cleanedStream = new MediaStream([
        ...destination.stream.getAudioTracks(),
        ...inputStream.getVideoTracks(),
      ]);

      return cleanedStream;
    },
    []
  );

  const cleanup = useCallback(() => {
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  return { applyNoiseSuppression, cleanup };
}
