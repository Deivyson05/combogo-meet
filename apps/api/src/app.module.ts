import { Module } from "@nestjs/common";
import { RoomsModule } from "./rooms/rooms.module";
import { TranscriptionModule } from "./transcription/transcription.module";
import { RedisModule } from "./redis/redis.module";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";

@Module({
  imports: [RedisModule, RoomsModule, TranscriptionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
