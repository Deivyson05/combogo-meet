import { Module } from "@nestjs/common";
import { TranscriptionController } from "./transcription.controller";
import { TranscriptionService } from "./transcription.service";
import { RoomsModule } from "../rooms/rooms.module";

@Module({
  imports: [RoomsModule],
  controllers: [TranscriptionController],
  providers: [TranscriptionService],
})
export class TranscriptionModule {}
