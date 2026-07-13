import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useWebRTC, loadIceServers } from "./useWebRTC";
import type {
  CallTarget,
  CallAnswerPayload,
  CallAcceptedPayload,
  CallHangupPayload,
  CallInvitePayload,
  CallOfferPayload,
  CallIcePayload,
  CallRejectedPayload,
  CallTogglePayload,
  User,
  Conversation,
} from "../types";

export type CallStatus =
  | "idle"
  | "ringing-out"
  | "ringing-in"
  | "connecting"
  | "in-call"
  | "ended";

export interface ActiveCall {
  callId: string;
  type: "audio" | "video";
  direction: "out" | "in";
  target: CallTarget;
  status: CallStatus;
  startedAt: number;

  /* For outgoing (where participants get discovered via accept/reject/connect) */
  recipients?: string[];

  /* Peer data */
  partner: { _id: string; name: string; avatar?: string } | null;
  groupName?: string;

  /* Self info as caller */
  caller?: { _id: string; name: string; avatar?: string };

  /* Currently connected peers (for groups) */
  peers: { _id: string; name: string; avatar?: string }[];
}

interface CallContextValue {
  active: ActiveCall | null;
  incoming: CallInvitePayload | null;
  startCall: (
    target: CallTarget,
    type: "audio" | "video",
    partner?: { _id: string; name: string; avatar?: string },
    groupName?: string
  ) => Promise<void>;
  acceptIncoming: () => void;
  rejectIncoming: (reason?: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  hangup: () => void;
  media: {
    local: ReturnType<typeof useWebRTC>["local"];
    remotes: ReturnType<typeof useWebRTC>["remotes"];
  };
}

const CallContext = createContext<CallContextValue | null>(null);

const RING_TIMEOUT_MS = 45000;

export const CallProviderInner = ({
  children,
  user,
  socket,
  token,
}: {
  children: React.ReactNode;
  user: User | null;
  socket: ReturnType<typeof useSocket>;
  token: string | null;
}) => {
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<CallInvitePayload | null>(null);
  const [callEndedFlag, setCallEndedFlag] = useState(0);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);

  const ringingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peersListRef = useRef<ActiveCall["peers"]>([]);
  const activeRef = useRef<ActiveCall | null>(null);
  const userRef = useRef<User | null>(null);
  const webRTCRef = useRef<ReturnType<typeof useWebRTC> | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /* Load ICE */
  useEffect(() => {
    if (!token) return;
    loadIceServers(token)
      .then((servers) => setIceServers(servers || []))
      .catch(() => setIceServers([]));
  }, [token]);

  /* Listen for incoming calls */
  useEffect(() => {
    if (!user?._id) return;
    const unsub = socket.addCallInviteListener((data: CallInvitePayload) => {
      if (data.fromUserId === user._id) return;
      // If already in a call, auto-reject
      if (activeRef.current) {
        socket.callReject(data.callId, data.fromUserId, "busy");
        return;
      }
      setIncoming(data);
    });
    return unsub;
  }, [socket, user?._id]);

  const endCallCleanup = useCallback(() => {
    setActive((prev) => (prev ? { ...prev, status: "ended" } : prev));
    setCallEndedFlag((c) => c + 1);
    if (ringingTimer.current) {
      clearTimeout(ringingTimer.current);
      ringingTimer.current = null;
    }
    setTimeout(() => {
      setActive(null);
      setIncoming(null);
    }, 1800);
  }, []);

  const endCallWith = useCallback(
    (reason: "rejected" | "canceled" | "peer-hangup" | "timeout" | "media-failed" | "user-hangup") => {
      const cur = activeRef.current;
      if (!cur) return;

      // Determine hangup target
      let hangupTo: string | undefined;
      if (cur.target.kind === "direct") {
        hangupTo = cur.partner?._id || cur.target.partnerId;
      }

      socket.callHangup({
        callId: cur.callId,
        ...(cur.target.kind === "group"
          ? { conversationId: cur.target.conversationId }
          : { to: hangupTo }),
      });

      endCallCleanup();
      void reason;
    },
    [socket, endCallCleanup]
  );

  /* call:accept — for caller: learn about the accepting peer, create polite peer */
  useEffect(() => {
    const unsub = socket.addCallAcceptedListener((data: CallAcceptedPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      const partnerName = data.acceptedBy.name;
      const partnerId = data.acceptedBy._id;

      peersListRef.current = [
        ...peersListRef.current.filter((p) => p._id !== partnerId),
        data.acceptedBy,
      ];
      setActive((prev) =>
        prev
          ? {
              ...prev,
              peers: [...prev.peers.filter((p) => p._id !== partnerId), data.acceptedBy],
              status: prev.status === "ringing-out" ? "connecting" : prev.status,
            }
          : prev
      );
      // caller-side: create a polite peer (we're not initiating, callee is)
      webRTCRef.current?.addPeer(partnerId, partnerName, false);
      void partnerName;
    });
    return unsub;
  }, [socket]);

  /* call:reject */
  useEffect(() => {
    const unsub = socket.addCallRejectedListener((data: CallRejectedPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      if (cur.recipients && cur.recipients.length > 1) {
        peersListRef.current = peersListRef.current.filter((p) => p._id !== data.by);
        setActive((prev) =>
          prev ? { ...prev, peers: prev.peers.filter((p) => p._id !== data.by) } : prev
        );
      } else {
        endCallWith("rejected");
      }
    });
    return unsub;
  }, [socket, endCallWith]);

  /* call:cancel — received by callee-side when caller cancels */
  useEffect(() => {
    const unsub = socket.addCallCanceledListener((data) => {
      // If we have an incoming call matching this callId, dismiss it
      setIncoming((prev) => (prev && prev.callId === data.callId ? null : prev));
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      endCallCleanup();
    });
    return unsub;
  }, [socket, endCallCleanup]);

  /* call:hangup */
  useEffect(() => {
    const unsub = socket.addCallHangupListener((data: CallHangupPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      if (data.by === userRef.current?._id) return;
      endCallWith("peer-hangup");
    });
    return unsub;
  }, [socket, endCallWith]);

  /* SDP / ICE relay handlers — wired after webRTC is created below */
  useEffect(() => {
    if (!active) return;
    const unsubOffer = socket.addCallOfferListener(async (data: CallOfferPayload) => {
      const cur = activeRef.current;
      const wr = webRTCRef.current;
      if (!cur || data.callId !== cur.callId || !wr) return;
      const peerEntry = peersListRef.current.find((p) => p._id === data.from);
      await wr.handleRemoteOffer(
        data.from,
        peerEntry?.name || cur.partner?.name || "Peer",
        data.sdp
      );
    });
    const unsubAnswer = socket.addCallAnswerListener(async (data: CallAnswerPayload) => {
      const cur = activeRef.current;
      const wr = webRTCRef.current;
      if (!cur || data.callId !== cur.callId || !wr) return;
      await wr.handleRemoteAnswer(data.from, data.sdp);
    });
    const unsubIce = socket.addCallIceListener(async (data: CallIcePayload) => {
      const cur = activeRef.current;
      const wr = webRTCRef.current;
      if (!cur || data.callId !== cur.callId || !wr) return;
      await wr.handleRemoteIce(data.from, data.candidate);
    });
    const unsubToggle = socket.addCallToggleListener((data: CallTogglePayload) => {
      webRTCRef.current?.updateRemoteState(data.from, {
        micEnabled: data.kind === "mic" ? data.enabled : undefined,
        camEnabled: data.kind === "cam" ? data.enabled : undefined,
      });
    });
    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubToggle();
    };
  }, [socket, active]);

  /* Build a stable signaling object for current user */
  const signaling = useMemo(
    () => ({
      sendOffer: (to: string, sdp: RTCSessionDescriptionInit) => {
        const cur = activeRef.current;
        const me = userRef.current;
        if (!cur || !me?._id) return;
        socket.callOffer({ callId: cur.callId, to, from: me._id, sdp });
      },
      sendAnswer: (to: string, sdp: RTCSessionDescriptionInit) => {
        const cur = activeRef.current;
        const me = userRef.current;
        if (!cur || !me?._id) return;
        socket.callAnswer({ callId: cur.callId, to, from: me._id, sdp });
      },
      sendIce: (to: string, candidate: RTCIceCandidateInit) => {
        const cur = activeRef.current;
        const me = userRef.current;
        if (!cur || !me?._id) return;
        socket.callIce({ callId: cur.callId, to, from: me._id, candidate });
      },
    }),
    [socket]
  );

  const webRTC = useWebRTC({
    type: active?.type ?? "audio",
    iceServers,
    callEnded: callEndedFlag > 0 && !active,
    signaling,
  });

  useEffect(() => {
    webRTCRef.current = webRTC;
  }, [webRTC]);

  /* Detect "in-call" once we have remote streams */
  useEffect(() => {
    if (!active) return;
    if (active.status === "in-call" || active.status === "ended") return;
    if (webRTC.remotes.length > 0) {
      setActive((prev) => (prev ? { ...prev, status: "in-call" } : prev));
    }
  }, [webRTC.remotes.length, active]);

  /* Acquire local media on call start */
  useEffect(() => {
    if (!active) return;
    if (active.status === "ended") return;
    webRTC.startLocalMedia(active.type).catch((err) => {
      console.error("getUserMedia failed", err);
      endCallWith("media-failed");
    });
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    if (active.status === "ringing-out") {
      ringingTimer.current = setTimeout(() => {
        endCallWith("timeout");
      }, RING_TIMEOUT_MS);
    }
    return () => {
      if (ringingTimer.current) clearTimeout(ringingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.callId, active?.status]);

  const startCall = useCallback(
    async (
      target: CallTarget,
      type: "audio" | "video",
      partner?: { _id: string; name: string; avatar?: string },
      groupName?: string
    ) => {
      const me = userRef.current;
      if (!me?._id) return;
      const callId = `call-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const newActive: ActiveCall = {
        callId,
        type,
        direction: "out",
        target,
        status: "ringing-out",
        startedAt: Date.now(),
        partner: target.kind === "direct" ? partner ?? null : null,
        groupName: target.kind === "group" ? groupName : undefined,
        peers: [],
      };
      setActive(newActive);
      peersListRef.current = [];
      const result = await socket.callInvite({
        callId,
        type,
        target,
        caller: { _id: me._id, name: me.name, avatar: me.avatar },
      });
      setActive((prev) =>
        prev && prev.callId === callId ? { ...prev, recipients: result.recipients } : prev
      );
      void me;
    },
    [socket]
  );

  const acceptIncoming = useCallback(async () => {
    const me = userRef.current;
    if (!incoming || !me?._id) return;
    const callId = incoming.callId;
    const fromUserId = incoming.fromUserId;
    const caller = incoming.caller;
    const target: CallTarget = incoming.conversationId
      ? { kind: "group", conversationId: incoming.conversationId }
      : { kind: "direct", partnerId: fromUserId };

    const newActive: ActiveCall = {
      callId,
      type: incoming.type,
      direction: "in",
      target,
      status: "connecting",
      startedAt: Date.now(),
      partner: { _id: caller._id, name: caller.name, avatar: caller.avatar },
      caller,
      peers: caller._id !== me._id ? [caller] : [],
    };
    setActive(newActive);
    peersListRef.current = caller._id !== me._id ? [caller] : [];
    setIncoming(null);

    // Notify caller/group that we accepted — include `to` (caller's ID) for direct routing
    socket.callAccept(
      callId,
      incoming.conversationId,
      fromUserId, // `to` field — tells server where to route call:accept
      { _id: me._id, name: me.name, avatar: me.avatar }
    );

    // Start local media FIRST, then create the peer
    // (useEffect on active?.callId will also call startLocalMedia, but we need it here
    //  to ensure tracks are attached before createPeer triggers onnegotiationneeded)
    // CRITICAL: pass incoming.type explicitly, because React may NOT have re-rendered
    // with the new `active.type` yet — so useWebRTC's internal `typeRef.current`
    // would still be the previous ("audio") value at the time startLocalMedia runs.
    try {
      await webRTCRef.current?.startLocalMedia(incoming.type);
    } catch (err) {
      console.error("Failed to acquire media for incoming call", err);
      // Still try to proceed — peer will be created without tracks
    }

    /* Callee becomes impolite (initiates the offer). Pass type explicitly
       so createPeer uses the correct type for camEnabled and tracks. */
    webRTCRef.current?.addPeer(caller._id, caller.name, true, incoming.type);
  }, [incoming, socket]);

  const rejectIncoming = useCallback(
    (reason?: string) => {
      if (!incoming) return;
      socket.callReject(incoming.callId, incoming.fromUserId, reason);
      setIncoming(null);
    },
    [incoming, socket]
  );

  const toggleMic = useCallback(() => {
    const cur = activeRef.current;
    if (!cur) return;
    // Read the ACTUAL track state before toggling to compute the new state accurately
    const stream = webRTC.local.stream;
    const currentEnabled = stream?.getAudioTracks()[0]?.enabled ?? webRTC.local.micEnabled;
    const newEnabled = !currentEnabled;

    webRTC.toggleMic();

    if (cur.target.kind === "group") {
      socket.callToggle({
        callId: cur.callId,
        kind: "mic",
        enabled: newEnabled,
        conversationId: cur.target.conversationId,
      });
    } else if (cur.partner) {
      socket.callToggle({
        callId: cur.callId,
        kind: "mic",
        enabled: newEnabled,
        to: cur.partner._id,
      });
    }
  }, [webRTC, socket]);

  const toggleCam = useCallback(() => {
    const cur = activeRef.current;
    if (!cur) return;
    // Read the ACTUAL track state before toggling to compute the new state accurately
    const stream = webRTC.local.stream;
    const currentEnabled = stream?.getVideoTracks()[0]?.enabled ?? webRTC.local.camEnabled;
    const newEnabled = !currentEnabled;

    webRTC.toggleCam();

    if (cur.target.kind === "group") {
      socket.callToggle({
        callId: cur.callId,
        kind: "cam",
        enabled: newEnabled,
        conversationId: cur.target.conversationId,
      });
    } else if (cur.partner) {
      socket.callToggle({
        callId: cur.callId,
        kind: "cam",
        enabled: newEnabled,
        to: cur.partner._id,
      });
    }
  }, [webRTC, socket]);

  const hangup = useCallback(() => {
    const cur = activeRef.current;
    if (!cur) return;
    if (cur.direction === "out" && cur.status === "ringing-out") {
      const recipients = cur.recipients || [];
      if (recipients.length) {
        socket.callCancel(cur.callId, recipients);
      }
      endCallCleanup();
      return;
    }

    // Determine hangup target
    let hangupTo: string | undefined;
    if (cur.target.kind === "direct") {
      hangupTo = cur.partner?._id || cur.target.partnerId;
    }

    socket.callHangup({
      callId: cur.callId,
      ...(cur.target.kind === "group"
        ? { conversationId: cur.target.conversationId }
        : { to: hangupTo }),
    });
    endCallCleanup();
  }, [socket, endCallCleanup]);

  const value = useMemo<CallContextValue>(
    () => ({
      active,
      incoming,
      startCall,
      acceptIncoming,
      rejectIncoming,
      toggleMic,
      toggleCam,
      hangup,
      media: { local: webRTC.local, remotes: webRTC.remotes },
    }),
    [
      active,
      incoming,
      startCall,
      acceptIncoming,
      rejectIncoming,
      toggleMic,
      toggleCam,
      hangup,
      webRTC.local,
      webRTC.remotes,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  const socket = useSocket();
  return (
    <CallProviderInner user={user} token={token} socket={socket}>
      {children}
    </CallProviderInner>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
};

export type { Conversation };
