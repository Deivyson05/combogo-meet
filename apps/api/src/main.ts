import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";


/**
 * Usado apenas em desenvolvimento local (`npm run start:dev`).
 * Em produção no Vercel, o entrypoint real é `api/index.ts`, que reaproveita
 * este mesmo AppModule dentro de uma função serverless.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(process.env.PORT ?? 3001);
  // eslint-disable-next-line no-console
  console.log(`API rodando em http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
