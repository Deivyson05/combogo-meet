"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
} from "lucide-react";
import clsx from "clsx";

export function CallControls({
  isMicOn,
  isCameraOn,
  isSharingScreen,
  isHost,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onEndForAll,
}: {
  isMicOn: boolean;
  isCameraOn: boolean;
  isSharingScreen: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
      <ControlButton
        active={isMicOn}
        onClick={onToggleMic}
        label={isMicOn ? "Silenciar microfone" : "Ativar microfone"}
        icon={isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
      />
      <ControlButton
        active={isCameraOn}
        onClick={onToggleCamera}
        label={isCameraOn ? "Desligar câmera" : "Ligar câmera"}
        icon={isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
      />
      <ControlButton
        active={isSharingScreen}
        onClick={onToggleScreenShare}
        label={isSharingScreen ? "Parar compartilhamento" : "Compartilhar tela"}
        icon={isSharingScreen ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
      />

      <div className="mx-1 h-6 w-px bg-ink-200 dark:bg-ink-700" />

      <button
        onClick={onLeave}
        aria-label="Sair da chamada"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
      >
        <PhoneOff size={18} />
      </button>

      {isHost && (
        <button
          onClick={onEndForAll}
          className="ml-1 rounded-full border border-red-200 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Encerrar para todos
        </button>
      )}
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
          : "bg-red-500 text-white hover:bg-red-600"
      )}
    >
      {icon}
    </button>
  );
}
