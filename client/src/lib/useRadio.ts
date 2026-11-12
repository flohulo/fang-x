import type { RtcIceServer, RtcSignal } from "@fang-x/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView, RtcHandler } from "./useGame";

export type RadioError = "unsupported" | "denied";

interface UseRadioOptions {
  myId: string | null;
  players: PlayerView[];
  iceServers: RtcIceServer[];
  sendRtc: (signal: RtcSignal, to?: string) => void;
  subscribeRtc: (handler: RtcHandler) => () => void;
}

interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  channel: RTCDataChannel | null;
  pendingIce: RTCIceCandidateInit[];
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;

/**
 * Detektiv-Funk: Push-to-talk über WebRTC, direkt zwischen den Detektiven (Mesh).
 * Der Server leitet nur die Signalisierung weiter. Wer zuerst "kleiner" ist (ID),
 * schickt das Angebot, damit sich beide nie gleichzeitig anbieten.
 */
export function useRadio(options: UseRadioOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [active, setActive] = useState(false);
  const [error, setError] = useState<RadioError | null>(null);
  const [transmitting, setTransmitting] = useState(false);
  const [linked, setLinked] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState<string[]>([]);

  const activeRef = useRef(false);
  const transmittingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, Peer>());
  const retriesRef = useRef(new Map<string, number>());

  const setLinkedFor = (id: string, isLinked: boolean) => {
    setLinked((current) => {
      const has = current.includes(id);
      if (isLinked === has) return current;
      return isLinked ? [...current, id] : current.filter((entry) => entry !== id);
    });
  };

  const setSpeakingFor = (id: string, isSpeaking: boolean) => {
    setSpeaking((current) => {
      const has = current.includes(id);
      if (isSpeaking === has) return current;
      return isSpeaking ? [...current, id] : current.filter((entry) => entry !== id);
    });
  };

  const closePeer = (id: string) => {
    const peer = peersRef.current.get(id);
    if (!peer) return;
    peersRef.current.delete(id);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.ondatachannel = null;
    peer.channel?.close();
    peer.pc.close();
    peer.audio.srcObject = null;
    setLinkedFor(id, false);
    setSpeakingFor(id, false);
  };

  const scheduleRetry = (id: string) => {
    const tries = retriesRef.current.get(id) ?? 0;
    if (tries >= MAX_RETRIES) return;
    retriesRef.current.set(id, tries + 1);
    window.setTimeout(() => {
      if (!activeRef.current || peersRef.current.has(id)) return;
      const stillThere = optionsRef.current.players.some((p) => p.id === id && p.connected);
      if (stillThere) optionsRef.current.sendRtc({ kind: "hello", reply: true }, id);
    }, RETRY_DELAY_MS);
  };

  const bindChannel = (id: string, peer: Peer, channel: RTCDataChannel) => {
    peer.channel = channel;
    channel.onopen = () => {
      if (channel.readyState === "open") channel.send(transmittingRef.current ? "1" : "0");
    };
    channel.onmessage = (event) => setSpeakingFor(id, event.data === "1");
  };

  const createPeer = (id: string, initiator: boolean): Peer | null => {
    const stream = streamRef.current;
    if (!stream) return null;
    closePeer(id);

    const pc = new RTCPeerConnection({ iceServers: optionsRef.current.iceServers });
    const audio = new Audio();
    audio.autoplay = true;
    const peer: Peer = { pc, audio, channel: null, pendingIce: [] };
    peersRef.current.set(id, peer);

    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);

    pc.onicecandidate = (event) => {
      const c = event.candidate;
      optionsRef.current.sendRtc(
        {
          kind: "ice",
          candidate: c
            ? { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex }
            : null,
        },
        id,
      );
    };
    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void audio.play().catch(() => {});
    };
    pc.ondatachannel = (event) => bindChannel(id, peer, event.channel);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        retriesRef.current.delete(id);
        setLinkedFor(id, true);
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (peersRef.current.get(id) === peer) {
          closePeer(id);
          scheduleRetry(id);
        }
      } else {
        setLinkedFor(id, false);
      }
    };

    if (initiator) bindChannel(id, peer, pc.createDataChannel("ptt"));
    return peer;
  };

  const flushIce = async (peer: Peer) => {
    const pending = peer.pendingIce.splice(0);
    for (const candidate of pending) {
      await peer.pc.addIceCandidate(candidate).catch(() => {});
    }
  };

  const offerTo = async (id: string) => {
    const peer = createPeer(id, true);
    if (!peer) return;
    try {
      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      const sdp = peer.pc.localDescription?.sdp;
      if (sdp) optionsRef.current.sendRtc({ kind: "offer", sdp }, id);
    } catch {
      closePeer(id);
    }
  };

  const handleSignal: RtcHandler = async (from, signal) => {
    if (!activeRef.current) return;
    const { myId, players } = optionsRef.current;
    if (!myId || !players.some((p) => p.id === from && p.connected)) return;

    switch (signal.kind) {
      case "hello": {
        if (signal.reply) optionsRef.current.sendRtc({ kind: "hello", reply: false }, from);
        if (myId < from && !peersRef.current.has(from)) await offerTo(from);
        break;
      }
      case "offer": {
        const peer = createPeer(from, false);
        if (!peer) return;
        try {
          await peer.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
          await flushIce(peer);
          await peer.pc.setLocalDescription(await peer.pc.createAnswer());
          const sdp = peer.pc.localDescription?.sdp;
          if (sdp) optionsRef.current.sendRtc({ kind: "answer", sdp }, from);
        } catch {
          closePeer(from);
        }
        break;
      }
      case "answer": {
        const peer = peersRef.current.get(from);
        if (!peer || peer.pc.signalingState !== "have-local-offer") return;
        try {
          await peer.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
          await flushIce(peer);
        } catch {
          closePeer(from);
        }
        break;
      }
      case "ice": {
        const peer = peersRef.current.get(from);
        if (!peer || !signal.candidate) return;
        if (peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(signal.candidate).catch(() => {});
        } else {
          peer.pendingIce.push(signal.candidate);
        }
        break;
      }
      case "bye":
        closePeer(from);
        break;
    }
  };

  const applyTransmitting = useCallback((on: boolean) => {
    transmittingRef.current = on;
    setTransmitting(on);
    for (const track of streamRef.current?.getAudioTracks() ?? []) track.enabled = on;
    for (const peer of peersRef.current.values()) {
      if (peer.channel?.readyState === "open") peer.channel.send(on ? "1" : "0");
    }
  }, []);

  const start = async () => {
    if (activeRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setError("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      for (const track of stream.getAudioTracks()) track.enabled = false;
      streamRef.current = stream;
    } catch {
      setError("denied");
      return;
    }
    setError(null);
    activeRef.current = true;
    retriesRef.current.clear();
    setActive(true);
    optionsRef.current.sendRtc({ kind: "hello", reply: true });
  };

  const stop = useCallback(() => {
    if (activeRef.current) optionsRef.current.sendRtc({ kind: "bye" });
    activeRef.current = false;
    for (const id of [...peersRef.current.keys()]) closePeer(id);
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    transmittingRef.current = false;
    setTransmitting(false);
    setActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signale entgegennehmen, solange die Komponente lebt.
  useEffect(() => {
    return optionsRef.current.subscribeRtc((from, signal) => {
      void handleSignal(from, signal);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verbindungen zu Spielern schliessen, die weg oder getrennt sind.
  useEffect(() => {
    for (const id of [...peersRef.current.keys()]) {
      const player = options.players.find((p) => p.id === id);
      if (!player || !player.connected || player.role === "X") closePeer(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.players]);

  // Beim Verlassen der Ansicht alles abbauen; im Hintergrund nicht senden.
  useEffect(() => {
    const release = () => {
      if (document.visibilityState === "hidden") applyTransmitting(false);
    };
    document.addEventListener("visibilitychange", release);
    window.addEventListener("blur", release);
    return () => {
      document.removeEventListener("visibilitychange", release);
      window.removeEventListener("blur", release);
      stop();
    };
  }, [applyTransmitting, stop]);

  return {
    active,
    error,
    transmitting,
    linked,
    speaking,
    start,
    stop,
    setTransmitting: (on: boolean) => {
      if (activeRef.current) applyTransmitting(on);
    },
  };
}
