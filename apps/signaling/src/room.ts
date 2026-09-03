import type * as Party from "partykit/server";

type JoinMessage = { type: "join"; name: string };
type LeaveMessage = { type: "leave" };
type SignalMessage = { type: "signal"; to: string; data: unknown };
type EndForAllMessage = { type: "end-for-all" };
type ChatMessage = { type: "chat"; text: string };
type IncomingMessage =
  | JoinMessage
  | LeaveMessage
  | SignalMessage
  | EndForAllMessage
  | ChatMessage;

export default class RoomServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  names = new Map<string, string>();

  onConnect(conn: Party.Connection) {}

  onMessage(message: string, sender: Party.Connection) {
    const msg: IncomingMessage = JSON.parse(message);

    switch (msg.type) {
      case "join": {
        this.names.set(sender.id, msg.name);
        const peers = [...this.names.entries()]
          .filter(([id]) => id !== sender.id)
          .map(([id, name]) => ({ id, name }));
        sender.send(JSON.stringify({ type: "peers", peers }));
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

      case "chat": {
        const name = this.names.get(sender.id) ?? "Alguém";
        this.broadcastAll({
          type: "chat",
          id: crypto.randomUUID(),
          from: sender.id,
          name,
          text: msg.text,
          ts: Date.now(),
        });
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

  private broadcastAll(payload: unknown) {
    const data = JSON.stringify(payload);
    for (const conn of this.room.getConnections()) {
      conn.send(data);
    }
  }

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
      // best-effort
    }
  }
}