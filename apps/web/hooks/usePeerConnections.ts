"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";

export type RemoteParticipant = {
  id: string;
  name: string;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
};

type SdpSignalData = { sdp: RTCSessionDescriptionInit; candidate?: undefined };
type CandidateSignalData = { candidate: RTCIceCandidateInit; sdp?: undefined };
type SignalData = SdpSignalData | CandidateSignalData;

type SignalMessage =
  | { type: "peers"; peers: { id: string; name: string }[] }
  | { type: "peer-joined"; id: string; name: string }
  | { type: "peer-left"; id: string }
  | { type: "signal"; from: string; data: SignalData }
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
  const [remoteParticipants, setRemoteParticipants] = useState
    Record<string, RemoteParticipant>
  >({});
  const [connected, setConnected] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);

  const socketRef = useRef<PartySocket | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localIdRef = useRef<string>("");

  const cameraSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraStreamIdRef = useRef<Map<string, string>>(new Map());

  const cleanupPeer = useCallback((peerId: string) => {
    cameraSendersRef.current.delete(peerId);
    screenSendersRef.current.delete(peerId);
    cameraStreamIdRef.current.delete(peerId);
    setRemoteParticipants((prev) => {
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
        const sender = pc.addTrack(track,