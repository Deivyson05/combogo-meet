import "dotenv/config";
import "reflect-metadata";
import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse): Promise<void>;
