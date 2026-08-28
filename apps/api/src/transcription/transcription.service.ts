import { Injectable, Logger } from "@nestjs/common";
import { RoomsService } from "../rooms/rooms.service";

/**
 * A transcrição roda em um servidor Whisper AUTO-HOSPEDADO (faster-whisper ou
 * whisper.cpp), separado desta função — conforme decidido: rodar o modelo
 * dentro de uma função serverless do Vercel não é viável de forma confiável
 * (sem GPU, sem cache de modelo entre invocações, tempo de execução limitado).
 *
 * Esta função apenas repassa o áudio para o servidor Whisper via HTTP e
 * guarda o texto resultante. Veja docs/DEPLOYMENT.md para como subir esse
 * servidor (ex: Fly.io, camada gratuita, com faster-whisper).
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(private readonly rooms: RoomsService) {}

  async transcribeChunk(
    roomId: string,
    speakerName: string,
    audio: Express.Multer.File
  ): Promise<void> {
    const whisperUrl = process.env.WHISPER_SERVER_URL;
    if (!whisperUrl) {
      this.logger.warn(
        "WHISPER_SERVER_URL não configurada — chunk de áudio descartado. Veja docs/DEPLOYMENT.md."
      );
      return;
    }

    const form = new FormData();
    form.append(
      "file",
      new Blob([audio.buffer], { type: audio.mimetype }),
      "chunk.webm"
    );
    form.append("language", "pt");

    const response = await fetch(`${whisperUrl}/transcribe`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      this.logger.error(`Falha ao transcrever chunk: ${response.status}`);
      return;
    }

    const { text } = (await response.json()) as { text: string };
    if (!text?.trim()) return;

    await this.rooms.appendTranscript(roomId, {
      speakerName,
      text: text.trim(),
      timestamp: Date.now(),
    });
  }
}
