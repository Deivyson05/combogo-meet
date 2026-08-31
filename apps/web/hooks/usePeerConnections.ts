"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

export type RemoteParticipant = {
  id: string;
  name: string;
  stream: MediaStream;
  isSharingScreen?: boolean;
};

type SignalMessage =
  | { type: "peers"; peers: { id: string; name: string }[] }
  | { type: "peer-joined"; id: string; name: string }
  | { type: "peer-left"; id: string }
  | { type: "signal"; from: string; data: any }
  | { type: "room-closed" }
  | { type: "screen-state"; from: string; isSharing: boolean };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function usePeerConnections(
  roomId: string,
  displayName: string,
  localStream: MediaStream | null
) {
  const [remoteParticipants, setRemoteParticipants] = useState<
    Record<string, RemoteParticipant>
  >({});
  const [connected, setConnected] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  const socketRef = useRef<PartySocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localIdRef = useRef<string>("");

  const createPeerConnection = useCallback(
    (peerId: string, peerName: string, initiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStream?.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.send(
            JSON.stringify({
              type: "signal",
              to: peerId,
              data: { candidate: event.candidate },
            })
          );
        }
      };

      pc.ontrack = (event) => {
        setRemoteParticipants((prev) => {
          const existing = prev[peerId];
          return {
            ...prev,
            [peerId]: {
              id: peerId,
              name: peerName,
              stream: event.streams[0],
              isSharingScreen: existing ? existing.isSharingScreen : false,
            },
          };
        });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          setRemoteParticipants((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        }
      };

      peersRef.current.set(peerId, pc);

      if (initiator) {
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.send(
            JSON.stringify({
              type: "signal",
              to: peerId,
              data: { sdp: pc.localDescription },
            })
          );
        };
      }

      return pc;
    },
    [localStream]
  );

  const handleSignal = useCallback(
    async (from: string, data: any) => {
      let pc = peersRef.current.get(from);
      if (!pc) return;

      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.send(
            JSON.stringify({
              type: "signal",
              to: from,
              data: { sdp: pc.localDescription },
            })
          );
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    },
    []
  );

  useEffect(() => {
    if (!localStream) return;

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: roomId,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      localIdRef.current = socket.id;
      socket.send(JSON.stringify({ type: "join", name: displayName }));
    });

    socket.addEventListener("message", (event) => {
      const msg: SignalMessage & { id?: string } = JSON.parse(event.data);

      switch (msg.type) {
        case "peers":
          localIdRef.current = socket.id;
          msg.peers.forEach((peer) => {
            const initiator = socket.id < peer.id;
            createPeerConnection(peer.id, peer.name, initiator);
          });
          break;
        case "peer-joined":
          createPeerConnection(msg.id, msg.name, false);
          break;
        case "peer-left": 
          peersRef.current.get(msg.id)?.close();
          peersRef.current.delete(msg.id);
          setRemoteParticipants((prev) => {
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
          break;
        case "signal":
          handleSignal(msg.from, msg.data);
          break;
        case "room-closed":
          setRoomClosed(true);
          break;
        case "screen-state":
          setRemoteParticipants((prev) => {
            const peer = prev[msg.from];
            if (!peer) return prev;
            return {
              ...prev,
              [msg.from]: { ...peer, isSharingScreen: msg.isSharing },
            };
          });
          break;
      }
    });

    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      socket.close();
    };
  }, [roomId, displayName, localStream, createPeerConnection, handleSignal]);

  const replaceVideoTrackForAll = useCallback((newTrack: MediaStreamTrack) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(newTrack);
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "leave" }));
    socketRef.current?.close();
  }, []);

  const broadcastScreenState = useCallback((isSharing: boolean) => {
    socketRef.current?.send(
      JSON.stringify({ type: "screen-state", from: localIdRef.current, isSharing })
    );
  }, []);

  return {
    remoteParticipants,
    connected,
    roomClosed,
    replaceVideoTrackForAll,
    broadcastScreenState,
    leaveRoom,
  };
}