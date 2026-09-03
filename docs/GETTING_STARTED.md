# Passo a passo completo

Ordem recomendada: **(1) completar o que ficou de placeholder → (2) testar
tudo local → (3) subir pra produção**. Fazer nessa ordem evita debugar
problema de deploy que na verdade é bug de código.

---

## Fase 0 — Pré-requisitos

- Node.js 20+ instalado (`node -v`)
- Conta grátis em: [vercel.com](https://vercel.com), [upstash.com](https://upstash.com), [partykit.io](https://partykit.io) (via GitHub), [fly.io](https://fly.io)
- CLIs instaladas globalmente:
  ```bash
  npm install -g vercel partykit flyctl
  ```

---

## Fase 1 — Completar as duas peças que ficaram como placeholder

### 1.1 RNNoise de verdade

O arquivo `apps/web/public/worklets/rnnoise-processor.js` tem um noise-gate
simples no lugar do modelo real. Caminho mais rápido: usar o pacote
`@jitsi/rnnoise-wasm`, que já traz o binário WASM pronto.

```bash
cd apps/web
npm install @jitsi/rnnoise-wasm
```

Troque o conteúdo do worklet para carregar o módulo real. Estrutura geral
(a API exata pode variar levemente por versão — confira o README do pacote
no npm ao instalar):

```js
import createRNNWasmModule from "@jitsi/rnnoise-wasm";

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ready = false;
    createRNNWasmModule().then((rnnoise) => {
      this.rnnoise = rnnoise;
      this.state = rnnoise._rnnoise_create();
      this.ready = true;
    });
  }

  process(inputs, outputs) {
    if (!this.ready) return true;
    // processa o frame de 480 amostras usando this.rnnoise / this.state
    // (siga o exemplo de uso do pacote para o processamento em si)
    return true;
  }
}

registerProcessor("rnnoise-processor", RNNoiseProcessor);
```

> AudioWorklets rodam em um escopo isolado sem `require`/bundler por padrão.
> Se o `import` não funcionar direto no navegador, empacote o worklet com
> esbuild antes do build do Next (`esbuild public/worklets/rnnoise-processor.js --bundle --outfile=public/worklets/rnnoise-processor.bundle.js`) e aponte `useNoiseSuppression.ts` pro arquivo `.bundle.js`.

### 1.2 Servidor de transcrição (Whisper)

Crie um projeto separado (fora do monorepo do front/back, pode ser uma
pasta irmã tipo `combogo-meet-whisper/`):

```bash
mkdir combogo-meet-whisper && cd combogo-meet-whisper
```

`requirements.txt`:
```
fastapi
uvicorn
faster-whisper
python-multipart
```

`main.py` (o exemplo já está no `docs/DEPLOYMENT.md` — copie de lá).

`Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Teste local antes de fazer deploy:
```bash
pip install -r requirements.txt
uvicorn main:app --port 8080
curl -X POST -F "file=@algum_audio.webm" http://localhost:8080/transcribe
```
Deve devolver `{"text": "..."}`. Se sim, siga para o deploy (Fase 3).

---

## Fase 2 — Testar tudo local (antes de qualquer deploy)

Você vai precisar de **3 terminais abertos ao mesmo tempo** (signaling, api,
web) — nessa ordem.

### 2.1 Sinalização (PartyKit) local

```bash
cd apps/signaling
npm install
npm run dev
```
Sobe em `http://127.0.0.1:1999`. Deixe rodando.

### 2.2 API (NestJS) local

```bash
cd apps/api
npm install
cp .env.example .env
```
Edite `.env`:
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` → pode usar o banco
  Upstash real mesmo em dev, é grátis e funciona de qualquer lugar.
- `PUBLIC_API_URL=http://localhost:3001`
- `WHISPER_SERVER_URL=http://localhost:8080` (o servidor da Fase 1.2, se
  estiver rodando local também; senão deixe em branco por enquanto —
  transcrição fica desativada mas o resto do app funciona normal)

```bash
npm run start:dev
```
Sobe em `http://localhost:3001`. Teste rápido:
```bash
curl -X POST http://localhost:3001/rooms
# deve devolver {"roomId":"..."}
```

### 2.3 Front-end (Next.js) local

```bash
cd apps/web
npm install
cp .env.local.example .env.local
```
Edite `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
```
```bash
npm run dev
```
Abre em `http://localhost:3000`.

### 2.4 Roteiro de teste manual

Use **duas abas normais do navegador** (ou uma normal + uma anônima, para
simular dois usuários diferentes sem conflito de permissão de câmera):

1. Aba 1: crie uma sala, permita câmera/mic, copie o link da URL.
2. Aba 2: cole o link, digite outro nome, entre.
3. ✅ Checar: os dois vídeos aparecem, um em cada aba, sem delay grande.
4. ✅ Testar mic: silencie numa aba, o ícone de mudo aparece pro outro lado.
5. ✅ Testar câmera: desligue, o avatar com a inicial do nome deve aparecer.
6. ✅ Testar compartilhamento de tela: clique, escolha uma janela — a outra
   aba deve trocar de vídeo da câmera pra tela automaticamente.
7. ✅ Deixe alguns segundos de fala em cada aba (para gerar chunks de
   áudio); se o Whisper local estiver rodando, confira no terminal da API
   se aparece log de chunk recebido.
8. Encerre a chamada (criador clica em "Encerrar para todos"): as duas abas
   devem cair na tela de "chamada terminou"; se houve transcrição, deve
   aparecer o botão de baixar o `.docx`.
9. ✅ Abra o `.docx` baixado e confira se o texto e os nomes batem.
10. Crie uma sala nova e **não entre nela** — depois de simular a
    expiração (ou aguardar o TTL em ambiente de teste reduzido), confirme
    que `GET /rooms/:id` volta `{"exists": false}`.

Se algo falhar aqui, é mais barato achar agora do que depois do deploy.

---

## Fase 3 — Deploy em produção (ordem importa)

Suba nessa ordem porque cada peça depois depende da URL da anterior.

### 3.1 Upstash Redis
Já deve estar pronto da Fase 2 (mesmo banco serve para dev e produção, ou
crie um separado para produção se preferir isolar os dados).

### 3.2 Servidor Whisper no Fly.io
```bash
cd combogo-meet-whisper
fly launch      # aceite os padrões, escolha uma região próxima do Brasil (gru/gig)
fly deploy
```
Copie a URL gerada (ex: `https://combogo-meet-whisper.fly.dev`).
Teste: `curl -X POST -F "file=@teste.webm" https://combogo-meet-whisper.fly.dev/transcribe`

### 3.3 PartyKit (sinalização)
Edite `apps/signaling/partykit.json`, campo `API_FINALIZE_URL`, para a URL
que a API vai ter no Vercel (você vai confirmar/ajustar no passo 3.4 se
mudar o nome do projeto):
```json
"API_FINALIZE_URL": "https://combogo-meet-api.vercel.app/rooms/finalize-webhook"
```
```bash
cd apps/signaling
npx partykit deploy
```
Copie o host retornado (ex: `combogo-meet-signaling.seu-usuario.partykit.dev`).

### 3.4 API (NestJS) no Vercel
```bash
cd apps/api
vercel link
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add PUBLIC_API_URL production        # a própria URL, ex: https://combogo-meet-api.vercel.app
vercel env add WHISPER_SERVER_URL production    # URL do passo 3.2
vercel deploy --prod
```
Teste: `curl -X POST https://combogo-meet-api.vercel.app/rooms`

Se a URL final da API for diferente do que você colocou no
`partykit.json` (passo 3.3), atualize o valor e rode
`npx partykit deploy` de novo.

### 3.5 Front-end (Next.js) no Vercel
```bash
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_API_URL production          # URL do passo 3.4
vercel env add NEXT_PUBLIC_PARTYKIT_HOST production    # host do passo 3.3
vercel deploy --prod
```

### 3.6 Smoke test em produção
Repita o roteiro da seção 2.4, mas agora com a URL de produção do Vercel,
de dois dispositivos/redes diferentes (ex: seu celular no 4G + seu
notebook no wifi) — isso testa de verdade se o TURN está funcionando para
atravessar NAT, o que `localhost` não testa.

---

## Fase 4 — Checklist final pós-deploy

- [ ] `getUserMedia`/`getDisplayMedia` só funcionam em HTTPS (ou
      `localhost`) — o Vercel já entrega HTTPS por padrão, então isso é
      automático em produção.
- [ ] Confirme que o TURN público (Open Relay) ainda está no ar — é um
      serviço comunitário gratuito e pode ficar instável; se perceber
      falhas de conexão entre redes diferentes, troque por um TURN próprio
      (`coturn`) ou um provedor pago, conforme `docs/DEPLOYMENT.md`.
- [ ] Ajuste o TTL da sala (`ROOM_TTL_SECONDS` em `rooms.service.ts`) para
      o que fizer sentido pro seu uso real (6h é só um valor inicial).
- [ ] Se quiser um domínio próprio (ex: `meet.combogo.com.br`), configure
      isso no painel do Vercel do projeto `apps/web`.
