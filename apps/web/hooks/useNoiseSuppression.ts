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

      let audioContext: AudioContext | null = null;
      try {
        audioContext = new AudioContext({ sampleRate: 48000 });
        audioContextRef.current = audioContext;
        if (audioContext.state !== "running") {
          throw new Error("O contexto de áudio não iniciou");
        }

        await audioContext.audioWorklet.addModule("/worklets/rnnoise-processor.bundle.js");

        const source = audioContext.createMediaStreamSource(
          new MediaStream([audioTrack])
        );
        const rnnoiseNode = new AudioWorkletNode(audioContext, "rnnoise-processor");
        const destination = audioContext.createMediaStreamDestination();

        source.connect(rnnoiseNode).connect(destination);

        return new MediaStream([
          ...destination.stream.getAudioTracks(),
          ...inputStream.getVideoTracks(),
        ]);
      } catch (error) {
        if (audioContext) {
          if (audioContextRef.current === audioContext) audioContextRef.current = null;
          void audioContext.close().catch(() => undefined);
        }
        console.warn("Supressão de ruído indisponível; usando o áudio original", error);
        return inputStream;
      }
    },
    []
  );

  const cleanup = useCallback(() => {
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  return { applyNoiseSuppression, cleanup };
}
