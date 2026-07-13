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

export interface PeerSignaling {
  /* Send signaling to peer over the wire */
  sendOffer: (to: string, sdp: RTCSessionDescriptionInit) => void;
  sendAnswer: (to: string, sdp: RTCSessionDescriptionInit) => void;
  sendIce: (to: string, candidate: RTCIceCandidateInit) => void;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  name: string;
  remoteStream: MediaStream;
  micEnabled: boolean;
  camEnabled: boolean;
  hasVideo: boolean;
  /* When true, this side is the impolite peer (initiates offers). When false, polite. */
  impolite: boolean;
  /* True if we've begun the offer/answer exchange */
  makingOffer: boolean;
  ignoreOffer: boolean;
  /* Whether local tracks have been added to this peer */
  tracksAttached: boolean;
}

export function useWebRTC(args: {
  type: "audio" | "video";
  iceServers: RTCIceServer[] | null;
  callEnded: boolean;
  signaling: PeerSignaling;
}) {
  const { type, iceServers, callEnded, signaling } = args;

  /* Keep a ref to the latest type so async functions (startLocalMedia, createPeer)
     always read the FRESHEST type, even when called from stale closures (e.g.
     acceptIncoming called before re-render with the new call-type completes). */
  const typeRef = useRef<"audio" | "video">(type);
  /* Update synchronously during render (NOT in useEffect) so that callers
     that read typeRef.current on the same tick get the correct value. */
  typeRef.current = type;

  const [local, setLocal] = useState<LocalMediaState>({
    stream: null,
    micEnabled: true,
    camEnabled: type === "video",
  });
  const [remotes, setRemotes] = useState<RemoteStreamInfo[]>([]);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescApplied = useRef<Map<string, boolean>>(new Map());

  /* Acquire local media. Optionally pass a `forceType` to override the current
     `typeRef.current` — useful when acceptIncoming is called before React commits
     the new call type (which means `typeRef.current` is still "audio"). */
  const startLocalMedia = useCallback(async (forceTypeOverride?: "audio" | "video") => {
    const currentType = forceTypeOverride ?? typeRef.current;
    if (localStreamRef.current) {
      const wantsVideo = currentType === "video";
      const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
      if (wantsVideo === hasVideo) return;
      console.log(`[WebRTC] startLocalMedia: cached stream doesn't match type=${currentType}, re-acquiring`);
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          currentType === "video"
            ? {
                width: { min: 320, ideal: 1280, max: 1920 },
                height: { min: 240, ideal: 720, max: 1080 },
                frameRate: { min: 15, ideal: 30, max: 60 },
                facingMode: "user",
              }
            : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`[WebRTC] getUserMedia success (type=${currentType}) — tracks:`,
        stream.getTracks().map(t => `${t.kind}(${t.id}) enabled=${t.enabled} readyState=${t.readyState}`));
      localStreamRef.current = stream;
      setLocal({ stream, micEnabled: true, camEnabled: currentType === "video" });

      peersRef.current.forEach((entry) => {
        if (!entry.tracksAttached) {
          stream.getTracks().forEach((t) => {
            if (!entry.pc.getSenders().some((s) => s.track && s.track.id === t.id)) {
              t.enabled = true;
              entry.pc.addTrack(t, stream);
            }
          });
          entry.tracksAttached = true;
        }
      });
    } catch (err) {
      setLocal({ stream: null, micEnabled: false, camEnabled: false });
      throw err;
    }
  }, []);

  /* Broadcast remote entry to React state */
  const upsertRemote = (peerId: string) => {
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

  /* Create a peer connection. impolite=true means this side owns offer creation.
     NOTE: This can now be called BEFORE local media is ready. Tracks will be attached
     lazily when startLocalMedia() completes. */
  const createPeer = useCallback(
    (peerId: string, name: string, impolite: boolean) => {
      if (!iceServers) return null;

      // If peer already exists, respect existing connection
      const existing = peersRef.current.get(peerId);
      if (existing) {
        if (existing.name !== name) {
          existing.name = name;
          upsertRemote(peerId);
        }
        return existing.pc;
      }

      const pc = new RTCPeerConnection({
        iceServers,
      });
      const remoteStream = new MediaStream();
      const currentType = typeRef.current;
      const entry: PeerEntry = {
        pc,
        name,
        remoteStream,
        micEnabled: true,
        camEnabled: currentType === "video",
        hasVideo: false,
        impolite,
        makingOffer: false,
        ignoreOffer: false,
        tracksAttached: false,
      };
      peersRef.current.set(peerId, entry);

      pc.ontrack = (ev) => {
        const track = ev.track;
        console.log(`[WebRTC] ontrack: kind=${track.kind} id=${track.id} readyState=${track.readyState}`);
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track);
        }
        if (track.kind === "video") {
          entry.hasVideo = true;
        }
        upsertRemote(peerId);
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          signaling.sendIce(peerId, ev.candidate.toJSON());
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state for ${peerId}: ${pc.iceConnectionState}`);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state for ${peerId}: ${pc.connectionState}`);
      };

      /* Perfect-negotiation: only the impolite peer initiates offers.
         CRITICAL: Wait until ALL local tracks (audio+video) are attached
         before creating the offer, so the offer includes m=video. */
      pc.onnegotiationneeded = async () => {
        try {
          if (entry.ignoreOffer) return;
          if (!entry.impolite) return;
          if (pc.signalingState !== "stable") return;
          if (!entry.tracksAttached) {
            console.log(`[WebRTC] onnegotiationneeded for ${peerId} SKIPPED — tracks not attached yet`);
            return;
          }
          console.log(`[WebRTC] onnegotiationneeded for ${peerId}, creating offer. Senders:`,
            pc.getSenders().map(s => s.track ? `${s.track.kind}(${s.track.id})` : `null`));
          entry.makingOffer = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log(`[WebRTC] offer sdp first 500 chars:`, (offer.sdp || "").slice(0, 500));
          signaling.sendOffer(peerId, pc.localDescription as RTCSessionDescriptionInit);
        } catch (err) {
          console.error("onnegotiationneeded error", err);
        } finally {
          entry.makingOffer = false;
        }
      };

      const attachLocalTracks = (stream: MediaStream) => {
        /* Deterministic order: audio first, then video. */
        stream.getAudioTracks().forEach((t) => {
          if (!entry.pc.getSenders().some((s) => s.track && s.track.id === t.id)) {
            t.enabled = true;
            entry.pc.addTrack(t, stream);
          }
        });
        stream.getVideoTracks().forEach((t) => {
          if (!entry.pc.getSenders().some((s) => s.track && s.track.id === t.id)) {
            t.enabled = true;
            entry.pc.addTrack(t, stream);
          }
        });
        entry.tracksAttached = true;
      };

      // Attach local media if already available
      if (localStreamRef.current) {
        attachLocalTracks(localStreamRef.current);
      }

      upsertRemote(peerId);
      return pc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iceServers, signaling]
  );

  /* Stop everything */
  const stopAll = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    peersRef.current.forEach((peer) => {
      try {
        peer.pc.close();
      } catch {
        /* noop */
      }
    });
    peersRef.current.clear();
    pendingIce.current.clear();
    remoteDescApplied.current.clear();
    setLocal({ stream: null, micEnabled: false, camEnabled: false });
    setRemotes([]);
  }, []);

  useEffect(() => {
    if (callEnded) stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callEnded]);

  /* Diagnostic: expose pc/refs globally so user can inspect from DevTools */
  useEffect(() => {
    (window as unknown as { __debugPeers?: unknown }).__debugPeers = {
      peers: peersRef.current,
      iceServers,
    };
  }, [iceServers]);

  /* Receive offer from peer */
  const handleRemoteOffer = useCallback(
    async (from: string, name: string, sdp: RTCSessionDescriptionInit) => {
      if (!iceServers) return;
      let entry = peersRef.current.get(from);
      if (!entry) {
        // We're receiving an offer — that means the *other* side is the impolite one,
        // and we're polite (responding). impolite=false.
        const pc = createPeer(from, name, false);
        if (!pc) return;
        const e2 = peersRef.current.get(from);
        if (!e2) return;
        entry = e2;
      }
      const pc = (entry as PeerEntry).pc;
      const offerCollision =
        sdp.type === "offer" &&
        (entry.makingOffer || pc.signalingState !== "stable");

      /* Impolite peer wins collisions. Polite peer rolls back. */
      const polite = !entry.impolite;
      const ignoreOffer = polite && offerCollision;
      entry.ignoreOffer = ignoreOffer;

      try {
        if (offerCollision) {
          console.log(`[WebRTC] handleRemoteOffer collision for ${from} - polite=${polite}`);
          await pc.setLocalDescription({
            type: "rollback",
          } as RTCSessionDescriptionInit);
        }
        console.log(`[WebRTC] incoming offer sdp:`, sdp.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        remoteDescApplied.current.set(from, true);
        console.log(`[WebRTC] setRemoteDescription done for ${from}. Senders:`,
          pc.getSenders().map(s => s.track ? `${s.track.kind}(${s.track.id})` : `null`));
        console.log(`[WebRTC] Receivers:`, pc.getReceivers().map(r => r.track ? `${r.track.kind}(${r.track.id})` : `null`));
        const queued = pendingIce.current.get(from) || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            /* noop */
          }
        }
        pendingIce.current.delete(from);
        if (sdp.type === "offer") {
          const answer = await pc.createAnswer();
          console.log(`[WebRTC] full answer sdp:`, answer.sdp);
          await pc.setLocalDescription(answer);
          signaling.sendAnswer(from, pc.localDescription as RTCSessionDescriptionInit);
        }
        entry.ignoreOffer = false;
        upsertRemote(from);
      } catch (err) {
        console.error("handleRemoteOffer error", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iceServers, signaling, createPeer]
  );

  const handleRemoteAnswer = useCallback(async (from: string, sdp: RTCSessionDescriptionInit) => {
    const entry = peersRef.current.get(from);
    if (!entry) return;
    try {
      if (entry.pc.signalingState !== "have-local-offer") {
        console.warn("handleRemoteAnswer: signalingState is not have-local-offer, ignoring");
        return;
      }
      await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      remoteDescApplied.current.set(from, true);
      const queued = pendingIce.current.get(from) || [];
      for (const cand of queued) {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          /* noop */
        }
      }
      pendingIce.current.delete(from);
      entry.ignoreOffer = false;
      upsertRemote(from);
    } catch (err) {
      console.error("handleRemoteAnswer error", err);
    }
  }, []);

  const handleRemoteIce = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const entry = peersRef.current.get(from);
    if (!entry) {
      const list = pendingIce.current.get(from) || [];
      list.push(candidate);
      pendingIce.current.set(from, list);
      return;
    }
    try {
      if (!entry.pc.remoteDescription || !remoteDescApplied.current.get(from)) {
        const list = pendingIce.current.get(from) || [];
        list.push(candidate);
        pendingIce.current.set(from, list);
        return;
      }
      await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("addIceCandidate error", err);
    }
  }, []);

  /* Manually register a peer: caller-side, called when call:accept arrives */
  const addPeer = useCallback(
    (peerId: string, name: string, impolite: boolean, typeOverride?: "audio" | "video") => {
      if (typeOverride) {
        typeRef.current = typeOverride;
      }
      const pc = createPeer(peerId, name, impolite);
      /* For impolite peers (the one initiating offers), if tracks are attached
         by the time addPeer runs, kick off negotiation explicitly instead of
         relying on onnegotiationneeded (which may have already fired during
         addTrack synchronously and been queued for a microtask BEFORE both
         audio+video tracks were attached in some edge cases). */
      if (pc && impolite) {
        const entry = peersRef.current.get(peerId);
        if (entry && entry.tracksAttached && pc.signalingState === "stable") {
          console.log(`[WebRTC] addPeer (impolite): explicitly triggering offer for ${peerId}`);
          queueMicrotask(async () => {
            try {
              if (entry.ignoreOffer) return;
              if (pc.signalingState !== "stable") return;
              console.log(`[WebRTC] explicit onnegotiation for ${peerId}. Senders:`,
                pc.getSenders().map(s => s.track ? `${s.track.kind}(${s.track.id})` : `null`));
              entry.makingOffer = true;
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log(`[WebRTC] explicit offer sdp first 500 chars:`, (offer.sdp || "").slice(0, 500));
              signaling.sendOffer(peerId, pc.localDescription as RTCSessionDescriptionInit);
            } catch (err) {
              console.error("explicit onnegotiation error", err);
            } finally {
              entry.makingOffer = false;
            }
          });
        } else {
          console.log(`[WebRTC] addPeer (impolite): tracks NOT attached yet for ${peerId}, deferring to onnegotiationneeded`);
        }
      }
      return pc;
    },
    [createPeer, signaling]
  );

  const updateRemoteState = useCallback(
    (
      from: string,
      partial: Partial<Pick<RemoteStreamInfo, "micEnabled" | "camEnabled">>
    ) => {
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
    const next = !tracks[0]?.enabled;
    tracks.forEach((t) => (t.enabled = next));
    setLocal((prev) => ({ ...prev, micEnabled: next }));
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getVideoTracks();
    if (!tracks.length) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          if (!localStreamRef.current) return;
          s.getVideoTracks().forEach((t) => {
            localStreamRef.current!.addTrack(t);
            peersRef.current.forEach((peer) => {
              if (!peer.pc.getSenders().some((st) => st.track && st.track.id === t.id)) {
                if (peer.pc.signalingState === "stable" || peer.pc.signalingState === "have-local-offer") {
                  peer.pc.addTrack(t, localStreamRef.current as MediaStream);
                }
              }
            });
          });
          setLocal((prev) => ({ ...prev, stream: localStreamRef.current, camEnabled: true }));
        })
        .catch(() => {
          /* noop */
        });
      return;
    }
    const next = !tracks[0]?.enabled;
    tracks.forEach((t) => (t.enabled = next));
    setLocal((prev) => ({ ...prev, camEnabled: next }));
  }, []);

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

export async function loadIceServers(token: string): Promise<RTCIceServer[]> {
  return fetchIceServers(token);
}
