"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

export type RemoteParticipant = {
  id: string;
  name: string;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
};

export type ChatMessage = {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
};

type SdpSignalData = { sdp: RTCSessionDescriptionInit; candidate?: undefined };
type CandidateSignalData = { candidate: RTCIceCandidateInit; sdp?: undefined };
type SignalData = SdpSignalData | CandidateSignalData;

type SignalMessage =
  | { type: "peers"; peers: { id: string; name: string }[] }
  | { type: "peer-joined"; id: string; name: string }
  | { type: "peer-left"; id: string }
  | { type: "signal"; from: string; data: SignalData }
  | { type: "chat"; id: string; from: string; name: string; text: string; ts: number }
  | { type: "room-closed" };

type PeerState = {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
};

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
  const [remoteParticipants, setRemoteParticipants] = useState <Record<string, RemoteParticipant>>({});
  const [connected, setConnected] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [localId, setLocalId] = useState("");

  const socketRef = useRef<PartySocket | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localIdRef = useRef<string>("");

  const cameraSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraStreamIdRef = useRef<Map<string, string>>(new Map());

  const chatStorageKey = `combogo-chat-${roomId}`;

  const cleanupPeer = useCallback((peerId: string) => {
    cameraSendersRef.current.delete(peerId);
    screenSendersRef.current.delete(peerId);
    cameraStreamIdRef.current.delete(peerId);
    setRemoteParticipants((prev: Record<string, RemoteParticipant>) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, peerName: string, initiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const state: PeerState = { pc, polite: !initiator, makingOffer: false, ignoreOffer: false };

      localStream?.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStream);
        if (track.kind === "video") cameraSendersRef.current.set(peerId, sender);
      });

      if (screenTrackRef.current) {
        const sender = pc.addTrack(
          screenTrackRef.current,
          new MediaStream([screenTrackRef.current])
        );
        screenSendersRef.current.set(peerId, sender);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.send(
            JSON.stringify({
              type: "signal",
              to: peerId,
              data: { candidate: event.candidate.toJSON() },
            })
          );
        }
      };

      pc.ontrack = (event) => {
        const incomingStream = event.streams[0];
        if (!incomingStream) return;

        setRemoteParticipants((prev: Record<string, RemoteParticipant>) => {
          const existing = prev[peerId] ?? {
            id: peerId,
            name: peerName,
            cameraStream: null,
            screenStream: null,
          };

          const knownCameraId = cameraStreamIdRef.current.get(peerId);

          if (!knownCameraId) {
            cameraStreamIdRef.current.set(peerId, incomingStream.id);
            return { ...prev, [peerId]: { ...existing, cameraStream: incomingStream } };
          }

          if (incomingStream.id === knownCameraId) {
            return { ...prev, [peerId]: { ...existing, cameraStream: incomingStream } };
          }

          incomingStream.onremovetrack = () => {
            setRemoteParticipants((p: Record<string, RemoteParticipant>) => {
              const current = p[peerId];
              if (!current || current.screenStream?.id !== incomingStream.id) return p;
              return { ...p, [peerId]: { ...current, screenStream: null } };
            });
          };

          return { ...prev, [peerId]: { ...existing, screenStream: incomingStream } };
        });
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          cleanupPeer(peerId);
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          state.makingOffer = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (pc.localDescription) {
            socketRef.current?.send(
              JSON.stringify({
                type: "signal",
                to: peerId,
                data: { sdp: pc.localDescription.toJSON() },
              })
            );
          }
        } catch (err) {
          console.error("Falha ao negociar oferta", err);
        } finally {
          state.makingOffer = false;
        }
      };

      peersRef.current.set(peerId, state);
      return pc;
    },
    [localStream, cleanupPeer]
  );

  const handleSignal = useCallback(async (from: string, data: SignalData) => {
    const state = peersRef.current.get(from);
    if (!state) return;
    const { pc } = state;

    if (data.sdp) {
      const offerCollision =
        data.sdp.type === "offer" &&
        (state.makingOffer || pc.signalingState !== "stable");

      state.ignoreOffer = !state.polite && offerCollision;
      if (state.ignoreOffer) return;

      if (offerCollision) {
        await Promise.all([
          pc.setLocalDescription({ type: "rollback" }),
          pc.setRemoteDescription(new RTCSessionDescription(data.sdp)),
        ]);
      } else {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }

      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          socketRef.current?.send(
            JSON.stringify({
              type: "signal",
              to: from,
              data: { sdp: pc.localDescription.toJSON() },
            })
          );
        }
      }
    } else if (data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        if (!state.ignoreOffer) throw err;
      }
    }
  }, []);

  useEffect(() => {
    if (!localStream) return;

    // Toda vez que entra na sala, o chat começa zerado.
    sessionStorage.removeItem(chatStorageKey);
    setChatMessages([]);

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: roomId,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
      setLocalId(socket.id);
      socket.send(JSON.stringify({ type: "join", name: displayName }));
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      const msg = JSON.parse(event.data) as SignalMessage;

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
          peersRef.current.get(msg.id)?.pc.close();
          peersRef.current.delete(msg.id);
          cleanupPeer(msg.id);
          break;
        case "signal":
          handleSignal(msg.from, msg.data);
          break;
        case "chat":
          setChatMessages((prev) => [
            ...prev,
            { id: msg.id, from: msg.from, name: msg.name, text: msg.text, ts: msg.ts },
          ]);
          break;
        case "room-closed":
          setRoomClosed(true);
          break;
      }
    });

    return () => {
      peersRef.current.forEach((state) => state.pc.close());
      peersRef.current.clear();
      cameraSendersRef.current.clear();
      screenSendersRef.current.clear();
      cameraStreamIdRef.current.clear();
      socket.close();
    };
  }, [roomId, displayName, localStream, createPeerConnection, handleSignal, cleanupPeer, chatStorageKey]);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    sessionStorage.setItem(chatStorageKey, JSON.stringify(chatMessages));
  }, [chatMessages, chatStorageKey]);

  const replaceCameraTrackForAll = useCallback((newTrack: MediaStreamTrack | null) => {
    cameraSendersRef.current.forEach((sender) => {
      sender.replaceTrack(newTrack);
    });
  }, []);

  const addScreenTrackForAll = useCallback((track: MediaStreamTrack) => {
    screenTrackRef.current = track;
    const screenStream = new MediaStream([track]);
    peersRef.current.forEach((state, peerId) => {
      const sender = state.pc.addTrack(track, screenStream);
      screenSendersRef.current.set(peerId, sender);
    });
  }, []);

  const removeScreenTrackForAll = useCallback(() => {
    screenTrackRef.current = null;
    peersRef.current.forEach((state, peerId) => {
      const sender = screenSendersRef.current.get(peerId);
      if (sender) {
        state.pc.removeTrack(sender);
        screenSendersRef.current.delete(peerId);
      }
    });
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    socketRef.current?.send(JSON.stringify({ type: "chat", text: trimmed }));
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "leave" }));
    socketRef.current?.close();
  }, []);

  return {
    remoteParticipants,
    connected,
    roomClosed,
    chatMessages,
    localId,
    replaceCameraTrackForAll,
    addScreenTrackForAll,
    removeScreenTrackForAll,
    sendChatMessage,
    leaveRoom,
  };
}