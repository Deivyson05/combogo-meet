"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, ArrowRight, ShieldCheck, MicOff, ScreenShare, Users, LockKeyhole } from "lucide-react";
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
    <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col overflow-x-clip px-5 sm:px-8">
      <header className="flex items-center justify-between border-b border-ink-200 py-5 dark:border-white/10">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs text-ink-600 sm:flex dark:text-ink-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Chamadas simples, sem cadastro
          </span>
          <ThemeToggle />
        </div>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-16">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-300">
            <LockKeyhole size={14} /> Privacidade do começo ao fim
          </div>
          <h1 className="font-serif text-5xl leading-[1.06] text-ink-900 sm:text-6xl lg:text-7xl dark:text-white">
            Conversas que aproximam.
            <span className="mt-2 block text-primary-400">Sem deixar rastro.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-600 sm:text-lg dark:text-ink-300">
            Abra uma sala, chame quem importa e fique à vontade. Vídeo, áudio e tela em um só lugar; terminou, a sala desaparece.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 border-t border-ink-200 pt-4 text-sm text-ink-700 dark:border-white/10 dark:text-ink-200">
              <MicOff size={17} className="shrink-0 text-primary-400" /> Áudio limpo
            </div>
            <div className="flex items-center gap-3 border-t border-ink-200 pt-4 text-sm text-ink-700 dark:border-white/10 dark:text-ink-200">
              <ScreenShare size={17} className="shrink-0 text-primary-400" /> Tela compartilhada
            </div>
            <div className="flex items-center gap-3 border-t border-ink-200 pt-4 text-sm text-ink-700 dark:border-white/10 dark:text-ink-200">
              <ShieldCheck size={17} className="shrink-0 text-primary-400" /> Sala temporária
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-4 -rotate-2 rounded-2xl border border-primary-500/20" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#171819] dark:shadow-black/40">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-xs font-medium uppercase text-ink-500 dark:text-ink-400">Comece por aqui</p>
                <h2 className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">Entre na conversa</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300">
                <Users size={19} />
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-ink-700 dark:text-ink-200">Seu nome</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como quer aparecer na chamada"
                  maxLength={40}
                  className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#101112] dark:text-white dark:placeholder:text-ink-500"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Video size={17} />
                {loading ? "Criando sala..." : "Criar uma sala"}
                {!loading && <ArrowRight size={16} />}
              </button>

              <div className="flex items-center gap-3 text-xs text-ink-500">
                <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" /> ou entre com um link <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
              </div>

              <div>
                <label htmlFor="room-code" className="mb-2 block text-sm font-medium text-ink-700 dark:text-ink-200">Link ou código da sala</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="room-code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Cole o link ou código"
                    className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#101112] dark:text-white dark:placeholder:text-ink-500"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-ink-300 px-4 py-3 text-sm font-medium text-ink-800 transition hover:border-primary-400 hover:bg-ink-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                  >
                    Entrar <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex items-center gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3 text-xs text-ink-600 dark:border-white/10 dark:bg-black/10 dark:text-ink-400">
              <ShieldCheck size={14} className="text-emerald-400" /> Sem conta. A sala é apagada ao fim da chamada.
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-ink-200 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <span>Combogó Unicap</span>
        <span>Voz, vídeo e compartilhamento em uma sala privada.</span>
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
