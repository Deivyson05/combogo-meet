# Deploy

## Confirmação: o back-end NestJS conecta certinho ao Vercel?

Sim, com a ressalva já explicada no README: **para as rotas REST** (`/rooms`,
`/transcription/chunk`, etc.) o padrão em `apps/api/api/index.ts` é o jeito
correto e testado de rodar NestJS no Vercel:

- usamos `ExpressAdapter` + `express()` puro (não `app.listen()`, quem
  escuta a porta é o runtime do Vercel);
- a instância é **cacheada entre invocações** (`cachedExpressApp`), então em
  requests subsequentes na mesma função "quente" não recriamos o Nest app
  inteiro — só o primeiro request (cold start) paga esse custo;
- `vercel.json` reescreve todas as rotas para `api/index.ts`, deixando o
  próprio NestJS decidir o roteamento interno (controllers cuidam disso).

O que **não** dá para colocar nessa mesma função é qualquer coisa que exija
conexão persistente (WebSocket de sinalização) — por isso essa parte foi para
o PartyKit, como explicado no README. Fora isso, o restante do back-end
(criação de sala, geração do documento, chamada ao servidor de transcrição)
é 100% compatível com o modelo serverless do Vercel.

## 1. Upstash Redis (grátis)

1. Crie uma conta em upstash.com e um banco Redis (região próxima do Vercel).
2. Copie `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

## 2. API (NestJS) no Vercel

```bash
cd apps/api
npm install
vercel link       # ou "vercel" e siga o assistente
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add PUBLIC_API_URL       # ex: https://combogo-meet-api.vercel.app
vercel env add WHISPER_SERVER_URL   # ver passo 4
vercel deploy --prod
```

## 3. Sinalização (PartyKit)

```bash
cd apps/signaling
npm install
npx partykit deploy
```

Isso devolve um host tipo `combogo-meet-signaling.<seu-usuario>.partykit.dev`
— use-o em `NEXT_PUBLIC_PARTYKIT_HOST` no front. Edite `partykit.json` e
troque `API_FINALIZE_URL` para a URL real da sua API no Vercel
(`https://.../rooms/finalize-webhook`) antes do deploy.

## 4. Servidor de transcrição (Whisper auto-hospedado)

Como confirmado, a transcrição usa Whisper auto-hospedado (não o app
desktop "Handy", que não é acessível por um back-end). Forma mais simples e
com camada gratuita: **Fly.io** rodando `faster-whisper` atrás de um
servidor HTTP fino.

Exemplo mínimo de servidor (Python, FastAPI) a colocar no seu repositório
do serviço de transcrição:

```python
from fastapi import FastAPI, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    audio_bytes = await file.read()
    with open("/tmp/chunk.webm", "wb") as f:
        f.write(audio_bytes)
    segments, _ = model.transcribe("/tmp/chunk.webm", language="pt")
    text = " ".join(s.text for s in segments)
    return {"text": text}
```

```bash
fly launch      # dentro da pasta desse servidor
fly deploy
```

Copie a URL gerada (`https://combogo-meet-whisper.fly.dev`) para a env
`WHISPER_SERVER_URL` da API no Vercel.

> Modelo `base` roda bem em CPU pequena com boa relação latência/qualidade
> para português. Se a fila de chunks (15s cada) atrasar muito, considere
> `tiny` para mais velocidade ou uma VM com mais CPU no Fly.io.

## 5. TURN server

Para começar, o projeto já usa o TURN público e gratuito do **Open Relay
Project** (`openrelay.metered.ca`), sem necessidade de conta. Para uso real
com mais tráfego, troque por:

- Cloudflare Calls (TURN gerenciado, camada gratuita generosa), ou
- seu próprio `coturn` em uma VM pequena (Fly.io/Oracle Cloud free tier).

Basta editar a lista `ICE_SERVERS` em
`apps/web/hooks/usePeerConnections.ts`.

## 6. Front-end (Next.js) no Vercel

```bash
cd apps/web
npm install
vercel link
vercel env add NEXT_PUBLIC_API_URL          # URL da API (passo 2)
vercel env add NEXT_PUBLIC_PARTYKIT_HOST    # host do PartyKit (passo 3)
vercel deploy --prod
```

## 7. Ativar o RNNoise de verdade

O worklet em `apps/web/public/worklets/rnnoise-processor.js` já está
estruturado corretamente, mas usa um noise-gate simples como placeholder
(ver comentário no topo do arquivo) — o binário WASM do RNNoise precisa ser
adicionado por você (via `@jitsi/rnnoise-wasm` ou compilando
github.com/xiph/rnnoise), pois não é possível embutir/baixar esse binário
neste scaffold. É uma troca de poucas linhas dentro do mesmo arquivo.
