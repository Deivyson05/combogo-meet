import type { Response } from "express";
import { RoomsService } from "./rooms.service";
export declare class RoomsController {
    private readonly rooms;
    constructor(rooms: RoomsService);
    create(): Promise<{
        roomId: string;
    }>;
    get(id: string): Promise<{
        exists: boolean;
    }>;
    finalize(id: string): Promise<{
        downloadUrl: string | null;
    }>;
    finalizeWebhook(roomId: string): Promise<{
        downloadUrl: string | null;
    }>;
    download(id: string, res: Response): Promise<void>;
}
