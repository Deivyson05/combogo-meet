import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { Express } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AppModule } from "../src/app.module";

/**
 * Ponto crítico da integração NestJS + Vercel:
 * - Vercel invoca este arquivo como uma função serverless a cada request.
 * - Criar um novo Nest app do zero a cada invocação seria lento e
 *   desperdiçaria "cold starts". Por isso cacheamos a instância do Express
 *   em uma variável de módulo: enquanto a função estiver "quente" (warm),
 *   invocações seguintes reaproveitam o mesmo app já inicializado.
 * - Não usamos app.listen() aqui — quem escuta a porta é o próprio runtime
 *   Node do Vercel. Só repassamos (req, res) para o Express por baixo do Nest.
 */
let cachedExpressApp: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (cachedExpressApp) return cachedExpressApp;

  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { cors: true, logger: ["error", "warn"] }
  );
  await nestApp.init();

  cachedExpressApp = expressApp;
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await bootstrapServer();
  server(req as any, res as any);
}
