"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";

export function VideoTile({
  stream,
  name,
  muted = false,
  isLocal = false,
  micOn = true,
  className,
}: {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  isLocal?: boolean;
  micOn?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = !!stream?.getVideoTracks().find((t) => t.enabled);

  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#191a1b] ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`h-full w-full object-cover ${isLocal ? "-scale-x-100" : ""} ${
          hasVideo ? "" : "hidden"
        }`}
      />
      {!hasVideo && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary-300/20 bg-primary-500/15 text-lg font-semibold text-primary-300">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md border border-white/10 bg-black/65 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm">
        {!micOn && <MicOff size={12} className="text-red-400" />}
        <span>{isLocal ? `${name} (você)` : name}</span>
      </div>
    </div>
  );
}