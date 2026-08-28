"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";

export function VideoTile({
  stream,
  name,
  muted = false,
  isLocal = false,
  micOn = true,
}: {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  isLocal?: boolean;
  micOn?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = !!stream?.getVideoTracks().find((t) => t.enabled);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl2 bg-ink-900">
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`h-full w-full object-cover ${isLocal ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/20 text-lg font-medium text-primary-300">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
        {!micOn && <MicOff size={12} className="text-red-400" />}
        <span>{isLocal ? `${name} (você)` : name}</span>
      </div>
    </div>
  );
}
