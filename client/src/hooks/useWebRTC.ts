import { useCallback, useEffect, useRef, useState } from "react";
import { fetchIceServers } from "../api/call";

export interface RemoteStreamInfo {
  userId: string;
  name: string;
  stream: MediaStream;
  hasVideo: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
}

export interface LocalMediaState {
  stream: MediaStream | null;
  micEnabled: boolean;
  camEnabled: boolean;
}

export interface UseCallArgs {
  type: "audio" | "video";
  iceServers: RTCIceServer[] | null;
  callEnded: boolean;
  onOffer: (to: string, sdp: RTCSessionDescriptionInit) => void;
  onAnswer: (to: string, sdp: RTCSessionDescriptionInit) => void;
  onIce: (to: string, candidate: RTCIceCandidateInit) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  name: string;
  remoteStream: MediaStream;
  micEnabled: boolean;
  camEnabled: boolean;
  hasVideo: boolean;
}

export function useWebRTC(args: UseCallArgs) {
  const {
    type,
    iceServers,
    callEnded,
    onOffer,
    onAnswer,
    onIce,
  } = args;

  const [local, setLocal] = useState<LocalMediaState>({
    stream: null,
    micEnabled: true,
    camEnabled: type === "video",
  });
  const [remotes, setRemotes] = useState<RemoteStreamInfo[]>([]);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  /* Acquire local media */
  const startLocalMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocal({ stream, micEnabled: true, camEnabled: type === "video" });
    } catch (err) {
      setLocal({ stream: null, micEnabled: false, camEnabled: false });
      throw err;
    }
  }, [type]);

  /* Stop everything */
  const stopAll = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    peersRef.current.forEach((peer) => {
      try { peer.pc.close(); } catch { /* noop */ }
    });
    peersRef.current.clear();
    pendingIce.current.clear();
    setLocal({ stream: null, micEnabled: false, camEnabled: false });
    setRemotes([]);
  }, []);

  useEffect(() => {
    if (callEnded) stopAll();
  }, [callEnded, stopAll]);

  /* Build a peer connection for `peerId`, with the local stream attached. */
  const createPeer = useCallback(
    (peerId: string, name: string, polite: boolean) => {
      if (!iceServers || !localStreamRef.current) return null;
      const pc = new RTCPeerConnection({ iceServers });
      const remoteStream = new MediaStream();
      let micEnabled = true;
      let camEnabled = type === "video";
      let hasVideo = false;

      const upsert = () => {
        const entry = peersRef.current.get(peerId);
        if (!entry) return;
        setRemotes((prev) => {
          const others = prev.filter((r) => r.userId !== peerId);
          return [
            ...others,
            {
              userId: peerId,
              name: entry.name,
              stream: entry.remoteStream,
              hasVideo: entry.hasVideo,
              micEnabled: entry.micEnabled,
              camEnabled: entry.camEnabled,
            },
          ];
        });
      };

      pc.ontrack = (ev) => {
        ev.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        ev.streams[0].getTracks().forEach((t) => {
          if (t.kind === "video") hasVideo = true;
        });
        peersRef.current.set(peerId, {
          pc,
          name,
          remoteStream,
          micEnabled,
          camEnabled,
          hasVideo,
        });
        upsert();
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          onIce(peerId, ev.candidate.toJSON());
        }
      };

      localStreamRef.current.getTracks().forEach((t) => {
        pc.addTrack(t, localStreamRef.current as MediaStream);
      });

      pc.onnegotiationneeded = async () => {
        try {
          if (!polite) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            onOffer(peerId, offer);
          }
        } catch (err) {
          console.error("negotiation error", err);
        }
      };

      peersRef.current.set(peerId, {
        pc,
        name,
        remoteStream,
        micEnabled,
        camEnabled,
        hasVideo,
      });
      return pc;
    },
    [iceServers, onIce, onOffer, type]
  );

  const handleRemoteOffer = useCallback(
    async (from: string, name: string, sdp: RTCSessionDescriptionInit) => {
      if (!iceServers) return;
      let entry = peersRef.current.get(from);
      let pc: RTCPeerConnection | null = entry?.pc ?? null;
      if (!pc) {
        const created = createPeer(from, name, true);
        if (!created) return;
        pc = created;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const queued = pendingIce.current.get(from) || [];
        for (const cand of queued) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { /* noop */ }
        }
        pendingIce.current.delete(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onAnswer(from, answer);
      } catch (err) {
        console.error("handleRemoteOffer error", err);
      }
    },
    [createPeer, iceServers, onAnswer]
  );

  const handleRemoteAnswer = useCallback(
    async (from: string, sdp: RTCSessionDescriptionInit) => {
      const entry = peersRef.current.get(from);
      if (!entry) return;
      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("setRemoteDescription error", err);
      }
    },
    []
  );

  const handleRemoteIce = useCallback(
    async (from: string, candidate: RTCIceCandidateInit) => {
      const entry = peersRef.current.get(from);
      if (!entry) {
        const list = pendingIce.current.get(from) || [];
        list.push(candidate);
        pendingIce.current.set(from, list);
        return;
      }
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("addIceCandidate error", err);
      }
    },
    []
  );

  /* Add a peer (called when a new participant joins a group call or when an offer arrives in 1:1) */
  const addPeer = useCallback(
    (peerId: string, name: string, polite: boolean) => {
      if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
      return createPeer(peerId, name, polite);
    },
    [createPeer]
  );

  const updateRemoteState = useCallback(
    (from: string, partial: Partial<Pick<RemoteStreamInfo, "micEnabled" | "camEnabled">>) => {
      const entry = peersRef.current.get(from);
      if (!entry) return;
      if (partial.micEnabled !== undefined) entry.micEnabled = partial.micEnabled;
      if (partial.camEnabled !== undefined) entry.camEnabled = partial.camEnabled;
      setRemotes((prev) =>
        prev.map((r) =>
          r.userId === from
            ? {
                ...r,
                micEnabled:
                  partial.micEnabled !== undefined ? partial.micEnabled : r.micEnabled,
                camEnabled:
                  partial.camEnabled !== undefined ? partial.camEnabled : r.camEnabled,
              }
            : r
        )
      );
    },
    []
  );

  /* Toggle local mic/cam */
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    const next = !local.micEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setLocal((prev) => ({ ...prev, micEnabled: next }));
  }, [local.micEnabled]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (!tracks.length) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          localStreamRef.current = s;
          peersRef.current.forEach((peer) => {
            s.getTracks().forEach((t) =>
              peer.pc.addTrack(t, localStreamRef.current as MediaStream)
            );
          });
          setLocal({ stream: s, micEnabled: local.micEnabled, camEnabled: true });
        })
        .catch(() => {/* noop */});
      return;
    }
    const next = !local.camEnabled;
    tracks.forEach((t) => (t.enabled = next));
    setLocal((prev) => ({ ...prev, camEnabled: next }));
  }, [local.camEnabled, local.micEnabled]);

  return {
    local,
    remotes,
    startLocalMedia,
    stopAll,
    addPeer,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIce,
    toggleMic,
    toggleCam,
    updateRemoteState,
  };
}

export function useCallId() {
  const ref = useRef<string>("");
  if (!ref.current) {
    ref.current = `call-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  }
  return ref.current;
}

export async function loadIceServers(token: string): Promise<RTCIceServer[]> {
  return fetchIceServers(token);
}
