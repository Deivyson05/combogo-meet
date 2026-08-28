import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { RoomsService } from "./rooms.service";

@Controller("rooms")
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create() {
    return this.rooms.createRoom();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const exists = await this.rooms.roomExists(id);
    return { exists };
  }

  /** Chamado pelo front quando o criador da sala clica em "Encerrar para todos". */
  @Post(":id/finalize")
  finalize(@Param("id") id: string) {
    return this.rooms.finalizeRoom(id);
  }

  /** Chamado pelo PartyKit quando a sala esvazia (última pessoa saiu). */
  @Post("finalize-webhook")
  finalizeWebhook(@Body("roomId") roomId: string) {
    return this.rooms.finalizeRoom(roomId);
  }

  /** Download único do documento final — a chave é apagada logo após a leitura. */
  @Get(":id/document")
  async download(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.rooms.getDocumentBuffer(id);
    if (!buffer) throw new NotFoundException("Documento indisponível ou já baixado.");

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="combogo-meet-${id}.docx"`,
    });
    res.send(buffer);
  }
}
