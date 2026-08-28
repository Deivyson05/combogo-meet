import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { VercelRequest, VercelResponse } from '@vercel/node';

const server = express();

async function bootstrap() {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    app.enableCors();
    await app.init();
}

const bootstrapPromise = bootstrap();

export default async (req: VercelRequest, res: VercelResponse) => {
    await bootstrapPromise;
    server(req, res);
}