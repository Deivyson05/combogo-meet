import { TranscriptionService } from "./transcription.service";
export declare class TranscriptionController {
    private readonly transcription;
    constructor(transcription: TranscriptionService);
    chunk(roomId: string, speakerName: string, audio: Express.Multer.File): Promise<{
        ok: boolean;
    }>;
}
