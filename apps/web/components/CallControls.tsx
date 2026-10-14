"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  PhoneOff,
  MessageSquare,
  Settings,
} from "lucide-react";
import clsx from "clsx";

export function CallControls({
  isMicOn,
  isCameraOn,
  isSharingScreen,
  isHost,
  isChatOpen,
  unreadCount,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  onEndForAll,
  onOpenSettings,
}: {
  isMicOn: boolean;
  isCameraOn: boolean;
  isSharingScreen: boolean;
  isHost: boolean;
  isChatOpen: boolean;
  unreadCount: number;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#1b1c1d]/95 px-3 py-2.5 shadow-2xl shadow-black/30 backdrop-blur sm:gap-3 sm:px-4">
      <ControlButton
        active={isMicOn}
        onClick={onToggleMic}
        label={isMicOn ? "Silenciar microfone" : "Ativar microfone"}
        icon={isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
      />
      <ControlButton active={false} onClick={onOpenSettings} label="Configurações de câmera e microfone" icon={<Settings size={18} />} />
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

      <div className="relative">
        <ControlButton
          active={isChatOpen}
          onClick={onToggleChat}
          label={isChatOpen ? "Fechar chat" : "Abrir chat"}
          icon={<MessageSquare size={18} />}
        />
        {unreadCount > 0 && !isChatOpen && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="mx-1 hidden h-6 w-px bg-white/15 sm:block" />

      <button
        onClick={onLeave}
        aria-label="Sair da chamada"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white transition-colors hover:bg-red-500"
      >
        <PhoneOff size={18} />
      </button>

      {isHost && (
        <button
          onClick={onEndForAll}
          className="ml-1 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
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
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-white/10 text-white hover:bg-white/15"
          : "bg-red-600 text-white hover:bg-red-500"
      )}
    >
      {icon}
    </button>
  );
}