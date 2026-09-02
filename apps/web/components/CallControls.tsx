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
} from "lucide-react";
import clsx from "clsx";

export function CallControls({
  isMicOn, isCameraOn, isSharingScreen, isHost,
  isChatOpen, unreadCount,
  onToggleMic, onToggleCamera, onToggleScreenShare, onToggleChat,
  onLeave, onEndForAll,
}: {
  isMicOn: boolean; isCameraOn: boolean; isSharingScreen: boolean; isHost: boolean;
  isChatOpen: boolean; unreadCount: number;
  onToggleMic: () => void; onToggleCamera: () => void; onToggleScreenShare: () => void;
  onToggleChat: () => void; onLeave: () => void; onEndForAll: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
      {/* ...botões de mic/câmera/tela já existentes... */}

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

      {/* ...resto igual (divisor, sair, encerrar)... */}
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



