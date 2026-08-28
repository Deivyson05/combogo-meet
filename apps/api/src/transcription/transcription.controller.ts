import { Body, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TranscriptionService } from "./transcription.service";

@Controller("transcription")
export class TranscriptionController {
  constructor(private readonly transcription: TranscriptionService) {}

  @Post("chunk")
  @UseInterceptors(FileInterceptor("audio"))
  async chunk(
    @Body("roomId") roomId: string,
    @Body("speakerName") speakerName: string,
    @UploadedFile() audio: Express.Multer.File
  ) {
    await this.transcription.transcribeChunk(roomId, speakerName, audio);
    return { ok: true };
  }
}
