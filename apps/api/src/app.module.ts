import { Module } from "@nestjs/common";
import { RoomsModule } from "./rooms/rooms.module";
import { TranscriptionModule } from "./transcription/transcription.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [RedisModule, RoomsModule, TranscriptionModule],
})
export class AppModule {}
