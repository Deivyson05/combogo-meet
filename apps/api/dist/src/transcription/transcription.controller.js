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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const transcription_service_1 = require("./transcription.service");
let TranscriptionController = class TranscriptionController {
    constructor(transcription) {
        this.transcription = transcription;
    }
    async chunk(roomId, speakerName, audio) {
        await this.transcription.transcribeChunk(roomId, speakerName, audio);
        return { ok: true };
    }
};
exports.TranscriptionController = TranscriptionController;
__decorate([
    (0, common_1.Post)("chunk"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("audio")),
    __param(0, (0, common_1.Body)("roomId")),
    __param(1, (0, common_1.Body)("speakerName")),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TranscriptionController.prototype, "chunk", null);
exports.TranscriptionController = TranscriptionController = __decorate([
    (0, common_1.Controller)("transcription"),
    __metadata("design:paramtypes", [transcription_service_1.TranscriptionService])
], TranscriptionController);
//# sourceMappingURL=transcription.controller.js.map