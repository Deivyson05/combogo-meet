"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import type { ChatMessage } from "@/hooks/usePeerConnections";

export function ChatPanel({
  messages,
  onSend,
  onClose,
  localId,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  localId: string;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  }

  return (
    <div className="fixed right-3 top-20 z-10 flex h-[min(500px,calc(100vh-7rem))] w-[min(400px,calc(100vw-1.5rem))] shrink-0 flex-col rounded-xl border border-white/10 bg-[#1b1c1d] shadow-2xl shadow-black/50 sm:right-6">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-medium text-ink-900 dark:text-white">Chat da chamada</span>
        <button onClick={onClose} aria-label="Fechar chat" className="rounded-md p-1 text-ink-400 transition hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-ink-400">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-white">
                {m.from === localId ? "Você" : m.name}
              </span>
              <span className="text-[10px] text-ink-400">
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-ink-200">{m.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111213] px-3 py-2 text-sm text-white outline-none placeholder:text-ink-500 focus:border-primary-500"
        />
        <button
          type="submit"
          aria-label="Enviar mensagem"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}