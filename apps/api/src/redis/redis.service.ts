import { Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";

/**
 * Usamos @upstash/redis (protocolo REST) em vez de ioredis/node-redis
 * propositalmente: essas bibliotecas mantêm um socket TCP persistente, o que
 * não combina com funções serverless que sobem e descem a qualquer momento.
 * O cliente REST da Upstash faz uma requisição HTTPS por comando — sem
 * estado de conexão para gerenciar, o que é exatamente o modelo do Vercel.
 */
@Injectable()
export class RedisService {
  readonly client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL as string,
    token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
  });
}
