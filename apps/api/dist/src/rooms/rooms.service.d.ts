import { RedisService } from "../redis/redis.service";
type TranscriptEntry = {
    speakerName: string;
    text: string;
    timestamp: number;
};
export declare class RoomsService {
    private readonly redis;
    constructor(redis: RedisService);
    createRoom(): Promise<{
        roomId: string;
    }>;
    roomExists(roomId: string): Promise<boolean>;
    appendTranscript(roomId: string, entry: TranscriptEntry): Promise<void>;
    finalizeRoom(roomId: string): Promise<{
        downloadUrl: string | null;
    }>;
    getDocumentBuffer(roomId: string): Promise<Buffer | null>;
}
export {};
