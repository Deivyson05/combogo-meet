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
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("./rooms.service");
let RoomsController = class RoomsController {
    constructor(rooms) {
        this.rooms = rooms;
    }
    create() {
        return this.rooms.createRoom();
    }
    async get(id) {
        const exists = await this.rooms.roomExists(id);
        return { exists };
    }
    finalize(id) {
        return this.rooms.finalizeRoom(id);
    }
    finalizeWebhook(roomId) {
        return this.rooms.finalizeRoom(roomId);
    }
    async download(id, res) {
        const buffer = await this.rooms.getDocumentBuffer(id);
        if (!buffer)
            throw new common_1.NotFoundException("Documento indisponível ou já baixado.");
        res.set({
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="combogo-meet-${id}.docx"`,
        });
        res.send(buffer);
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Post)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(":id/finalize"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)("finalize-webhook"),
    __param(0, (0, common_1.Body)("roomId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "finalizeWebhook", null);
__decorate([
    (0, common_1.Get)(":id/document"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "download", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)("rooms"),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map