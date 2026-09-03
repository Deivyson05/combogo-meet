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
var TranscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("../rooms/rooms.service");
let TranscriptionService = TranscriptionService_1 = class TranscriptionService {
    constructor(rooms) {
        this.rooms = rooms;
        this.logger = new common_1.Logger(TranscriptionService_1.name);
    }
    async transcribeChunk(roomId, speakerName, audio) {
        const whisperUrl = process.env.WHISPER_SERVER_URL;
        if (!whisperUrl) {
            this.logger.warn("WHISPER_SERVER_URL não configurada — chunk de áudio descartado. Veja docs/DEPLOYMENT.md.");
            return;
        }
        const form = new FormData();
        form.append("file", new Blob([audio.buffer], { type: audio.mimetype }), "chunk.webm");
        form.append("language", "pt");
        const response = await fetch(`${whisperUrl}/transcribe`, {
            method: "POST",
            body: form,
        });
        if (!response.ok) {
            this.logger.error(`Falha ao transcrever chunk: ${response.status}`);
            return;
        }
        const { text } = (await response.json());
        if (!text?.trim())
            return;
        await this.rooms.appendTranscript(roomId, {
            speakerName,
            text: text.trim(),
            timestamp: Date.now(),
        });
    }
};
exports.TranscriptionService = TranscriptionService;
exports.TranscriptionService = TranscriptionService = TranscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], TranscriptionService);
//# sourceMappingURL=transcription.service.js.map