import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';

const server = express();

// Habilita o CORS no nível do Express para pegar requisições OPTIONS (preflight) imediatamente
server.use(cors({
  origin: ['https://combogo-meet.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    
    // Opcional: se sua API usa prefixo global, descomente a linha abaixo:
    // app.setGlobalPrefix('api');

    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  await bootstrap();
  return server(req, res);
};