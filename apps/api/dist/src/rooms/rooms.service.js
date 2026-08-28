"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const nanoid_1 = require("nanoid");
const docx_1 = require("docx");
const redis_service_1 = require("../redis/redis.service");
const ROOM_TTL_SECONDS = 6 * 60 * 60;
const DOCUMENT_TTL_SECONDS = 10 * 60;
let RoomsService = class RoomsService {
    constructor(redis) {
        this.redis = redis;
    }
    async createRoom() {
        const roomId = (0, nanoid_1.nanoid)(10);
        await this.redis.client.set(`room:${roomId}`, JSON.stringify({ createdAt: Date.now() }), { ex: ROOM_TTL_SECONDS });
        return { roomId };
    }
    async roomExists(roomId) {
        const value = await this.redis.client.get(`room:${roomId}`);
        return value !== null;
    }
    async appendTranscript(roomId, entry) {
        await this.redis.client.rpush(`transcript:${roomId}`, JSON.stringify(entry));
        await this.redis.client.expire(`room:${roomId}`, ROOM_TTL_SECONDS);
    }
    async finalizeRoom(roomId) {
        const rawEntries = await this.redis.client.lrange(`transcript:${roomId}`, 0, -1);
        await this.redis.client.del(`room:${roomId}`);
        await this.redis.client.del(`transcript:${roomId}`);
        if (!rawEntries || rawEntries.length === 0) {
            return { downloadUrl: null };
        }
        const entries = rawEntries
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
    async getDocumentBuffer(roomId) {
        const base64 = await this.redis.client.get(`doc:${roomId}`);
        if (!base64)
            return null;
        await this.redis.client.del(`doc:${roomId}`);
        return Buffer.from(base64, "base64");
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RoomsService);
async function buildTranscriptDocx(roomId, entries) {
    const doc = new docx_1.Document({
        sections: [
            {
                children: [
                    new docx_1.Paragraph({
                        text: "Transcrição da chamada — Combogó Meet",
                        heading: docx_1.HeadingLevel.HEADING_1,
                    }),
                    new docx_1.Paragraph({
                        text: `Sala: ${roomId} · Gerado em ${new Date().toLocaleString("pt-BR")}`,
                    }),
                    new docx_1.Paragraph({ text: "" }),
                    ...entries.map((entry) => new docx_1.Paragraph({
                        children: [
                            new docx_1.TextRun({ text: `${formatTime(entry.timestamp)} `, italics: true }),
                            new docx_1.TextRun({ text: `${entry.speakerName}: `, bold: true }),
                            new docx_1.TextRun({ text: entry.text }),
                        ],
                    })),
                ],
            },
        ],
    });
    return docx_1.Packer.toBuffer(doc);
}
function formatTime(ts) {
    return new Date(ts).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}
//# sourceMappingURL=rooms.service.js.map