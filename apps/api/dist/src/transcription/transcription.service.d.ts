import { RoomsService } from "../rooms/rooms.service";
export declare class TranscriptionService {
    private readonly rooms;
    private readonly logger;
    constructor(rooms: RoomsService);
    transcribeChunk(roomId: string, speakerName: string, audio: Express.Multer.File): Promise<void>;
}
