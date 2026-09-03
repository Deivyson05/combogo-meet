import { Injectable } from "@nestjs/common";
import { nanoid } from "nanoid";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { RedisService } from "../redis/redis.service";

const ROOM_TTL_SECONDS = 6 * 60 * 60; // sala não usada expira em 6h
const DOCUMENT_TTL_SECONDS = 10 * 60; // link de download some em 10min

type TranscriptEntry = {
  speakerName: string;
  text: string;
  timestamp: number;
};

@Injectable()
export class RoomsService {
  constructor(private readonly redis: RedisService) {}

  async createRoom(): Promise<{ roomId: string }> {
    const roomId = nanoid(10);
    await this.redis.client.set(
      `room:${roomId}`,
      JSON.stringify({ createdAt: Date.now() }),
      { ex: ROOM_TTL_SECONDS }
    );
    return { roomId };
  }

  async roomExists(roomId: string): Promise<boolean> {
    const value = await this.redis.client.get(`room:${roomId}`);
    return value !== null;
  }

  async appendTranscript(roomId: string, entry: TranscriptEntry) {
    await this.redis.client.rpush(`transcript:${roomId}`, JSON.stringify(entry));
    // renova o TTL da sala enquanto ela estiver em uso
    await this.redis.client.expire(`room:${roomId}`, ROOM_TTL_SECONDS);
  }

  /**
   * Chamado quando a chamada termina (host encerrou, ou o PartyKit avisou
   * que a sala esvaziou). Monta o .docx com a transcrição, guarda por um
   * tempo curto para download, e apaga todo o restante dos dados da sala.
   */
  async finalizeRoom(roomId: string): Promise<{ downloadUrl: string | null }> {
    const rawEntries = await this.redis.client.lrange(
      `transcript:${roomId}`,
      0,
      -1
    );

    await this.redis.client.del(`room:${roomId}`);
    await this.redis.client.del(`transcript:${roomId}`);

    if (!rawEntries || rawEntries.length === 0) {
      return { downloadUrl: null };
    }

    const entries: TranscriptEntry[] = rawEntries
      .map((raw) => (typeof raw === "string" ? JSON.parse(raw) : raw))
      .sort((a, b) => a.timestamp - b.timestamp);

    const buffer = await buildTranscriptDocx(roomId, entries);
    const base64 = buffer.toString("base64");

    await this.redis.client.set(`doc:${roomId}`, base64, {
      ex: DOCUMENT_TTL_SECONDS,
    });

    const apiUrl = process.env.PUBLIC_API_URL ?? "";
    return { downloadUrl: `${apiUrl}/rooms/${roomId}/document` };
  }

  /** Download único: entrega o documento e apaga a chave em seguida. */
  async getDocumentBuffer(roomId: string): Promise<Buffer | null> {
    const base64 = await this.redis.client.get<string>(`doc:${roomId}`);
    if (!base64) return null;
    await this.redis.client.del(`doc:${roomId}`);
    return Buffer.from(base64, "base64");
  }
}

async function buildTranscriptDocx(
  roomId: string,
  entries: TranscriptEntry[]
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Transcrição da chamada — Combogó Meet",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Sala: ${roomId} · Gerado em ${new Date().toLocaleString("pt-BR")}`,
          }),
          new Paragraph({ text: "" }),
          ...entries.map(
            (entry) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${formatTime(entry.timestamp)} `, italics: true }),
                  new TextRun({ text: `${entry.speakerName}: `, bold: true }),
                  new TextRun({ text: entry.text }),
                ],
              })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
