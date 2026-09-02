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
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl2 border border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <span className="text-sm font-medium text-ink-900 dark:text-white">Chat da chamada</span>
        <button onClick={onClose} aria-label="Fechar chat" className="text-ink-400 hover:text-ink-600">
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
              <span className="font-medium text-ink-900 dark:text-white">
                {m.from === localId ? "Você" : m.name}
              </span>
              <span className="text-[10px] text-ink-400">
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-ink-600 dark:text-ink-300">{m.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-ink-100 p-3 dark:border-ink-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-lg border border-ink-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary-500 dark:border-ink-700"
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