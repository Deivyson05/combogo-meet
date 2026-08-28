import type * as Party from "partykit/server";

type JoinMessage = { type: "join"; name: string };
type LeaveMessage = { type: "leave" };
type SignalMessage = { type: "signal"; to: string; data: unknown };
type EndForAllMessage = { type: "end-for-all" };
type IncomingMessage =
  | JoinMessage
  | LeaveMessage
  | SignalMessage
  | EndForAllMessage;

/**
 * Uma "sala" (Party.Room) por chamada. O PartyKit mantém o processo vivo
 * enquanto houver conexões — exatamente o que uma função serverless do
 * Vercel não sustenta. Quando a última pessoa sai, avisamos a API para
 * ela apagar a sala e gerar o documento final.
 */
export default class RoomServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  names = new Map<string, string>(); // connectionId -> nome de exibição

  onConnect(conn: Party.Connection) {
    // A conexão só é anunciada aos outros depois do "join" (para já vir com nome).
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg: IncomingMessage = JSON.parse(message);

    switch (msg.type) {
      case "join": {
        this.names.set(sender.id, msg.name);

        // Envia ao recém-chegado a lista de quem já está na sala.
        const peers = [...this.names.entries()]
          .filter(([id]) => id !== sender.id)
          .map(([id, name]) => ({ id, name }));
        sender.send(JSON.stringify({ type: "peers", peers }));

        // Avisa os demais que alguém novo entrou.
        this.broadcastExcept(sender.id, {
          type: "peer-joined",
          id: sender.id,
          name: msg.name,
        });
        break;
      }

      case "signal": {
        const target = this.room.getConnection(msg.to);
        target?.send(
          JSON.stringify({ type: "signal", from: sender.id, data: msg.data })
        );
        break;
      }

      case "leave": {
        this.handleDeparture(sender.id);
        break;
      }

      case "end-for-all": {
        this.broadcastExcept(sender.id, { type: "room-closed" });
        sender.send(JSON.stringify({ type: "room-closed" }));
        this.notifyApiRoomClosed();
        break;
      }
    }
  }

  onClose(conn: Party.Connection) {
    this.handleDeparture(conn.id);
  }

  private handleDeparture(id: string) {
    this.names.delete(id);
    this.broadcastExcept(id, { type: "peer-left", id });

    if (this.names.size === 0) {
      this.notifyApiRoomClosed();
    }
  }

  private broadcastExcept(exceptId: string, payload: unknown) {
    const data = JSON.stringify(payload);
    for (const conn of this.room.getConnections()) {
      if (conn.id !== exceptId) conn.send(data);
    }
  }

  /** Sala vazia (ou encerrada pelo host) → API finaliza a transcrição e apaga tudo. */
  private async notifyApiRoomClosed() {
    const url = (this.room.env.API_FINALIZE_URL as string) || "";
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: this.room.id }),
      });
    } catch {
      // best-effort — a sala do Redis também tem TTL como rede de segurança
    }
  }
}
