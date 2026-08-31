"use client";

import { useEffect, useRef } from "react";
import { MicOff } from "lucide-react";
import clsx from "clsx";

export function VideoTile({
  stream,
  name,
  muted = false,
  isLocal = false,
  micOn = true,
  small = false,
  className,
}: {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  isLocal?: boolean;
  micOn?: boolean;
  small?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const videoTrack = stream?.getVideoTracks()[0];
  const hasVideo = !!videoTrack && videoTrack.enabled && videoTrack.readyState === "live";

  return (
    <div className={clsx("relative aspect-video overflow-hidden rounded-xl2 bg-ink-900", className)}>
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || muted}
          className={`h-full w-full object-cover ${isLocal ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={clsx(
              "flex items-center justify-center rounded-full bg-primary-500/20 font-medium text-primary-300",
              small ? "h-8 w-8 text-xs" : "h-14 w-14 text-lg"
            )}
          >
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div
        className={clsx(
          "absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-white backdrop-blur-sm",
          small ? "text-[10px]" : "text-xs"
        )}
      >
        {!micOn && <MicOff size={small ? 10 : 12} className="text-red-400" />}
        <span>{isLocal ? `${name} (você)` : name}</span>
      </div>
    </div>
  );
}