# Combogó Meet

Salas de videochamada temporárias, sem conta, com supressão de ruído (RNNoise) e
transcrição automática (Whisper) disponível para download. Quando a chamada acaba,
a sala e os dados são apagados.

## Por que o projeto tem 3 pastas (e não é sobre desconfiar do Vercel)

O Vercel é ótimo para hospedar o **front-end (Next.js)** e **APIs stateless**
(REST: criar sala, gerar documento, etc). O que ele **não sustenta bem** é uma
conexão **WebSocket de longa duração** — e sinalização WebRTC (troca de
SDP/ICE entre os participantes) e presença ("quem está na sala agora")
precisam exatamente disso.

Por isso este projeto usa:

```
apps/
  web/         → Next.js + Tailwind — deploy normal no Vercel (grátis)
  api/         → NestJS — deploy no Vercel como Serverless Functions (grátis)
                 cuida de: criar/expirar sala, disparar transcrição, gerar o
                 documento final para download. Tudo stateless.
  signaling/   → PartyKit — WebSocket de sinalização WebRTC + presença + TTL
                 da sala. Roda na Cloudflare edge. Tem plano free generoso e
                 foi desenhado exatamente para "salas temporárias que expiram
                 sozinhas" (é o mesmo problema que o Vercel não resolve).
```

Ou seja: **o back-end "NestJS adaptado para o Vercel" existe e funciona
perfeitamente** — ele só não é o responsável pela parte de tempo real. Essa
divisão é o que faz tudo continuar "grátis e rápido como o Vercel", como você
pediu.

## Peças e onde cada uma roda

| Peça | Tecnologia | Onde roda | Grátis? |
|---|---|---|---|
| Front-end | Next.js 14 + Tailwind | Vercel | Sim |
| API REST (salas, doc final) | NestJS | Vercel (Serverless Functions) | Sim |
| Sinalização WebRTC + presença | PartyKit | Cloudflare (via PartyKit) | Sim (free tier) |
| Estado da sala / TTL | Upstash Redis | Serverless, integra com Vercel | Sim (free tier) |
| STUN/TURN (NAT traversal) | STUN público do Google + TURN do Open Relay Project (ou Cloudflare Calls TURN) | Externo | Sim (free tier) |
| Transcrição | whisper.cpp (modelo `base`, compilado para WASM) rodando dentro da própria função NestJS no Vercel | Vercel | Sim, com limite de tamanho/tempo de áudio por chunk (ver `docs/DEPLOYMENT.md`) |

Nenhuma dessas peças exige cartão de crédito para começar.

## Fluxo de uma chamada

1. Usuário cria uma sala (`POST /rooms`) → API gera `roomId` curto, guarda no
   Redis com TTL (ex: expira sozinha em 6h se ninguém entrar), devolve o link.
2. Cada participante abre `/room/[roomId]`, digita **só o nome** (sem conta) e
   entra.
3. O front conecta no PartyKit (`wss://.../parties/room/{roomId}`) para trocar
   sinalização WebRTC. As conexões de mídia (áudio/vídeo/tela) são
   **peer-to-peer** via WebRTC (mesh), usando STUN/TURN para atravessar NAT.
4. O áudio de cada participante passa por um **AudioWorklet com RNNoise**
   antes de ser enviado — supressão de ruído acontece no dispositivo do
   usuário, sem custo de servidor.
5. Em paralelo, pequenos trechos do áudio de cada pessoa são enviados para
   `POST /transcription/chunk` (NestJS), que roda Whisper e guarda o texto
   transcrito, rotulado com o nome de quem falou, no Redis daquela sala.
6. Quando a chamada termina (todos saem, ou o criador encerra), o PartyKit
   avisa a API. A API monta o documento final (`.docx`, via biblioteca de
   geração de documentos) com o diálogo transcrito e o disponibiliza como link
   de download **só para o criador da sala**.
7. Passado um curto período (ou imediatamente após o download), a API apaga
   tudo do Redis: sala, transcrição, link. Nada fica retido.

Veja `docs/ARCHITECTURE.md` para o diagrama detalhado e `docs/DEPLOYMENT.md`
para o passo a passo de deploy de cada peça.
