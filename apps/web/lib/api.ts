import { transcribeChunkInDesktop } from "@/hooks/screenShareRepository";

// Keep API requests same-origin in the browser; Next.js proxies them to the
// configured backend so browser CORS policy does not depend on the deployment URL.
const API_URL = "/api/backend";

export async function createRoom(): Promise<{ roomId: string }> {
  const res = await fetch(`${API_URL}/rooms`, { method: "POST" });
  if (!res.ok) throw new Error("Falha ao criar sala");
  return res.json();
}

export async function getRoom(roomId: string): Promise<{ exists: boolean }> {
  const res = await fetch(`${API_URL}/rooms/${roomId}`);
  if (!res.ok) return { exists: false };
  return res.json();
}

/** Envia um trecho de áudio de um participante para transcrição (Whisper). */
export async function sendTranscriptionChunk(
  roomId: string,
  speakerName: string,
  audioBlob: Blob
): Promise<void> {
  if (await transcribeChunkInDesktop(roomId, speakerName, audioBlob)) return;

  const form = new FormData();
  form.append("roomId", roomId);
  form.append("speakerName", speakerName);
  form.append("audio", audioBlob, "chunk.webm");

  await fetch(`${API_URL}/transcription/chunk`, {
    method: "POST",
    body: form,
  }).catch(() => {
    // best-effort: perder um chunk de transcrição não deve derrubar a chamada
  });
}

/** Chamado pelo criador da sala ao encerrar. Retorna link assinado do documento. */
export async function finalizeRoom(
  roomId: string
): Promise<{ downloadUrl: string | null }> {
  const res = await fetch(`${API_URL}/rooms/${roomId}/finalize`, {
    method: "POST",
  });
  if (!res.ok) return { downloadUrl: null };
  return res.json();
}
