"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, ArrowRight, ShieldCheck, MicOff, ScreenShare } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createRoom } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom() {
    if (!name.trim()) {
      setError("Digite seu nome para criar a sala.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { roomId } = await createRoom();
      sessionStorage.setItem("combogo-display-name", name.trim());
      router.push(`/room/${roomId}?host=1`);
    } catch (e) {
      setError("Não foi possível criar a sala agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleJoinRoom() {
    if (!name.trim()) {
      setError("Digite seu nome para entrar na sala.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Cole o código ou link da sala.");
      return;
    }
    setError(null);
    sessionStorage.setItem("combogo-display-name", name.trim());
    const id = extractRoomId(roomCode.trim());
    router.push(`/room/${id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <ThemeToggle />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-10 py-12 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-900 dark:text-white sm:text-5xl">
            Uma chamada.{" "}
            <span className="text-primary-500">Sem conta. Sem rastro.</span>
          </h1>
          <p className="mx-auto max-w-xl text-balance text-base text-ink-500 dark:text-ink-300">
            Crie uma sala temporária, compartilhe o link e converse — com vídeo,
            tela e supressão de ruído. Quando a chamada termina, a sala é apagada.
          </p>
        </div>

        <div className="w-full max-w-md space-y-4 rounded-2xl border border-ink-100
                        bg-white/60 p-6 text-left shadow-sm backdrop-blur
                        dark:border-ink-800 dark:bg-ink-900/60">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
              Seu nome
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quer aparecer na chamada"
              maxLength={40}
              className="w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5
                         text-sm text-ink-900 placeholder:text-ink-400 outline-none
                         focus:border-primary-500 dark:border-ink-700 dark:bg-ink-950
                         dark:text-white"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg
                       bg-primary-500 px-4 py-2.5 text-sm font-medium text-white
                       transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            <Video size={16} />
            {loading ? "Criando sala..." : "Criar sala nova"}
          </button>

          <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-ink-400">
            <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
            ou
            <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
          </div>

          <div className="flex gap-2">
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Cole o link ou código da sala"
              className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3.5
                         py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none
                         focus:border-primary-500 dark:border-ink-700 dark:bg-ink-950
                         dark:text-white"
            />
            <button
              onClick={handleJoinRoom}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200
                         px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors
                         hover:bg-ink-50 dark:border-ink-700 dark:text-ink-100
                         dark:hover:bg-ink-800"
            >
              Entrar <ArrowRight size={15} />
            </button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-ink-400 dark:text-ink-500">
          <li className="flex items-center gap-1.5"><MicOff size={14} /> Supressão de ruído</li>
          <li className="flex items-center gap-1.5"><ScreenShare size={14} /> Compartilhamento de tela</li>
          <li className="flex items-center gap-1.5"><ShieldCheck size={14} /> Sala apagada ao fim da chamada</li>
        </ul>
      </section>

      <footer className="py-6 text-center text-xs text-ink-400 dark:text-ink-600">
        Combogó Unicap
      </footer>
    </main>
  );
}

function extractRoomId(input: string): string {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || input;
  } catch {
    return input;
  }
}
