# Arquitetura

```
┌─────────────────────┐        HTTPS (REST)        ┌──────────────────────────┐
│   Next.js (Vercel)   │ ─────────────────────────► │  NestJS (Vercel Fns)     │
│                      │ ◄───────────────────────── │  /rooms  /transcription  │
│  - Landing (criar/   │      JSON                  │                          │
│    entrar em sala)   │                             │  - cria/valida sala      │
│  - Sala (grid vídeo, │                             │  - recebe chunk de áudio │
│    controles)        │                             │    → roda Whisper       │
│  - RNNoise (client)  │                             │  - monta docx final      │
└─────────┬────────────┘                             │  - apaga tudo no fim     │
          │  WebSocket (sinalização + presença)       └─────────┬────────────────┘
          ▼                                                     │
┌──────────────────────┐                                        │
│  PartyKit (Cloudflare)│                                       │ Redis (Upstash)
│  1 "room" por chamada │◄──────────────────────────────────────┘ (TTL automático)
│  - troca SDP/ICE      │
│  - lista quem entrou  │
│  - avisa quando a     │
│    sala esvazia       │
└──────────┬────────────┘
           │
           ▼
   WebRTC P2P (mesh) entre os navegadores
   ├─ áudio (com RNNoise aplicado antes de enviar)
   ├─ vídeo (webcam)
   └─ compartilhamento de tela (getDisplayMedia)
   usando STUN público + TURN (Open Relay / Cloudflare Calls) quando o P2P
   direto não é possível (redes com NAT simétrico/firewall corporativo)
```

## Por que mesh P2P (e não SFU)

Para grupos pequenos (até ~6 pessoas), uma malha P2P onde cada participante
troca mídia diretamente com todos os outros é suficiente e não exige nenhum
servidor de mídia (SFU/MCU) — o que mantém o projeto 100% dentro de
provedores gratuitos. Se no futuro você precisar suportar salas maiores,
o ponto de troca é isolado: bastaria substituir `usePeerConnections` por um
cliente de SFU (ex: LiveKit, mediasoup) sem tocar no resto do sistema.

## Ciclo de vida da sala (autodestruição)

1. `POST /rooms` cria uma chave `room:{id}` no Redis com `EX` (TTL) — ex:
   6 horas caso ninguém entre.
2. Ao primeiro participante entrar, o PartyKit renova esse estado ("sala
   ativa") e passa a controlar a lista de presença em memória.
3. Quando o último participante sai (ou o criador clica em "Encerrar para
   todos"), o PartyKit dispara um webhook para
   `POST /rooms/:id/finalize` na API.
4. A API:
   - junta os trechos transcritos (ordenados por tempo) em um documento;
   - gera um link de download de curta duração (assinado, expira em minutos);
   - deleta a chave `room:{id}` e todas as chaves de transcrição associadas.
5. Se ninguém nunca entrou e o TTL do Redis expira sozinho, a sala
   simplesmente deixa de existir — não há passo manual de limpeza.

## Segurança e privacidade (pontos a decidir com atenção antes de produção)

- O nome digitado ao entrar não é autenticado — é só um rótulo de exibição.
  Isso é intencional (não precisar criar conta), mas significa que qualquer
  pessoa com o link pode entrar. Considere um PIN opcional por sala se isso
  for um problema.
- O link de download do documento final deve ser de posse do criador da sala
  apenas — recomenda-se um token assinado (JWT curto) gerado no
  `finalize`, não um ID previsível.
- O TURN público gratuito (Open Relay Project) é adequado para prototipagem;
  para uso com tráfego real considere um TURN próprio (coturn em uma
  VM pequena) ou um provedor pago (Twilio, Cloudflare Calls) para não
  depender da disponibilidade de um servidor comunitário.
