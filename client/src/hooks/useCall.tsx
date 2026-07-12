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
  startCall: (target: CallTarget, type: "audio" | "video", partner?: { _id: string; name: string; avatar?: string }, groupName?: string) => Promise<void>;
  acceptIncoming: () => void;
  rejectIncoming: (reason?: string) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  hangup: () => void;
  /* In-call helpers exposing local/remotes */
  media: {
    local: ReturnType<typeof useWebRTC>["local"];
    remotes: ReturnType<typeof useWebRTC>["remotes"];
  };
}

const CallContext = createContext<CallContextValue | null>(null);

const TYPING_RING_TIMEOUT_MS = 45000; // drop invite after 45s with no answer

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

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  /* Get ICE */
  useEffect(() => {
    if (!token) return;
    loadIceServers(token).then(setIceServers).catch(() => setIceServers([]));
  }, [token]);

  /* Listen for incoming calls */
  useEffect(() => {
    if (!user?._id) return;
    const unsub = socket.addCallInviteListener((data: CallInvitePayload) => {
      if (data.fromUserId === user._id) return;
      setIncoming(data);
    });
    return unsub;
  }, [socket, user?._id]);

  /* When call:accept arrives mark caller side as connected */
  useEffect(() => {
    const unsub = socket.addCallAcceptedListener((data: CallAcceptedPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      peersListRef.current = [
        ...peersListRef.current.filter((p) => p._id !== data.acceptedBy._id),
        data.acceptedBy,
      ];
      setActive((prev) =>
        prev
          ? {
              ...prev,
              peers: [...prev.peers.filter((p) => p._id !== data.acceptedBy._id), data.acceptedBy],
              status: prev.status === "ringing-out" ? "connecting" : prev.status,
            }
          : prev
      );
    });
    return unsub;
  }, [socket]);

  /* call:reject */
  useEffect(() => {
    const unsub = socket.addCallRejectedListener((data: CallRejectedPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      if (cur.recipients && cur.recipients.length > 1) {
        /* Group call: just remove this peer */
        peersListRef.current = peersListRef.current.filter((p) => p._id !== data.by);
        setActive((prev) =>
          prev
            ? { ...prev, peers: prev.peers.filter((p) => p._id !== data.by) }
            : prev
        );
      } else {
        endCallWith("rejected");
      }
    });
    return unsub;
  }, [socket]);

  /* call:cancel */
  useEffect(() => {
    const unsub = socket.addCallCanceledListener((data) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      if (cur.direction === "in") endCallWith("canceled");
    });
    return unsub;
  }, [socket]);

  /* call:hangup */
  useEffect(() => {
    const unsub = socket.addCallHangupListener((data: CallHangupPayload) => {
      const cur = activeRef.current;
      if (!cur || data.callId !== cur.callId) return;
      if (data.by === user?._id) return;
      endCallWith("peer-hangup");
    });
    return unsub;
  }, [socket, user?._id]);

  const onOffer = useCallback(
    (to: string, sdp: RTCSessionDescriptionInit) => {
      if (!active) return;
      socket.callOffer({ callId: active.callId, to, from: user!._id, sdp });
    },
    [socket, active, user?._id]
  );

  const onAnswer = useCallback(
    (to: string, sdp: RTCSessionDescriptionInit) => {
      if (!active) return;
      socket.callAnswer({ callId: active.callId, to, from: user!._id, sdp });
    },
    [socket, active, user?._id]
  );

  const onIce = useCallback(
    (to: string, candidate: RTCIceCandidateInit) => {
      if (!active) return;
      socket.callIce({ callId: active.callId, to, from: user!._id, candidate });
    },
    [socket, active, user?._id]
  );

  const webRTC = useWebRTC({
    type: active?.type ?? "audio",
    iceServers,
    callEnded: callEndedFlag > 0 && !active,
    onOffer,
    onAnswer,
    onIce,
  });

  /* Wire remote offer/answer/ice handlers */
  useEffect(() => {
    if (!active) return;
    const unsubOffer = socket.addCallOfferListener(async (data: CallOfferPayload) => {
      if (data.callId !== active.callId) return;
      if (!peersListRef.current.some((p) => p._id === data.from)) {
        peersListRef.current = [...peersListRef.current, { _id: data.from, name: "Peer", avatar: undefined }];
      }
      const peerEntry = peersListRef.current.find((p) => p._id === data.from);
      await webRTC.handleRemoteOffer(data.from, peerEntry?.name || "Peer", data.sdp);
    });
    const unsubAnswer = socket.addCallAnswerListener(async (data: CallAnswerPayload) => {
      if (data.callId !== active.callId) return;
      await webRTC.handleRemoteAnswer(data.from, data.sdp);
    });
    const unsubIce = socket.addCallIceListener(async (data: CallIcePayload) => {
      if (data.callId !== active.callId) return;
      await webRTC.handleRemoteIce(data.from, data.candidate);
    });
    const unsubToggle = socket.addCallToggleListener((data: CallTogglePayload) => {
      webRTC.updateRemoteState(data.from, {
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
  }, [socket, active, webRTC]);

  /* Detect call completion: when 1+ remote streams are flowing we say "in-call" */
  useEffect(() => {
    if (!active) return;
    if (active.status === "in-call") return;
    if (webRTC.remotes.length > 0) {
      setActive((prev) => (prev ? { ...prev, status: "in-call" } : prev));
    }
  }, [webRTC.remotes.length, active]);

  /* Start local media whenever a call becomes active */
  useEffect(() => {
    if (!active) return;
    if (active.status === "ended") return;
    webRTC.startLocalMedia().catch((err) => {
      console.error("getUserMedia failed", err);
      endCallWith("media-failed");
    });
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    if (active.status === "ringing-out") {
      ringingTimer.current = setTimeout(() => {
        endCallWith("timeout");
      }, TYPING_RING_TIMEOUT_MS);
    }
    return () => {
      if (ringingTimer.current) clearTimeout(ringingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.callId, active?.status]);

  const endCallWith = useCallback(
    (reason: "rejected" | "canceled" | "peer-hangup" | "timeout" | "media-failed" | "user-hangup") => {
      const cur = activeRef.current;
      if (!cur) return;
      /* Hangup to remote peers if any */
      socket.callHangup({
        callId: cur.callId,
        ...(cur.target.kind === "group"
          ? { conversationId: cur.target.conversationId }
          : { to: cur.partner?._id ?? cur.target.kind === "direct" ? cur.target.partnerId : undefined }),
      });
      setActive((prev) => (prev ? { ...prev, status: "ended" } : prev));
      setCallEndedFlag((c) => c + 1);
      webRTC.stopAll();
      /* Auto-clean after small UX delay so UI can show summary */
      setTimeout(() => {
        setActive(null);
        setIncoming(null);
      }, 1800);
      void reason;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socket, webRTC]
  );

  const startCall = useCallback(
    async (target: CallTarget, type: "audio" | "video", partner?: { _id: string; name: string; avatar?: string }, groupName?: string) => {
      if (!user?._id) return;
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
        caller: { _id: user._id, name: user.name, avatar: user.avatar },
      });
      /* Patch recipients we'll use later for cancel routing */
      setActive((prev) =>
        prev && prev.callId === callId ? { ...prev, recipients: result.recipients } : prev
      );
    },
    [user?._id, user?.name, user?.avatar, socket]
  );

  const acceptIncoming = useCallback(() => {
    if (!incoming || !user?._id) return;
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
      peers: caller._id !== user._id ? [caller] : [],
    };
    setActive(newActive);
    peersListRef.current = caller._id !== user._id ? [caller] : [];
    setIncoming(null);
    socket.callAccept(callId, incoming.conversationId, {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
    });
  }, [incoming, user, socket]);

  const rejectIncoming = useCallback(
    (reason?: string) => {
      if (!incoming) return;
      socket.callReject(incoming.callId, incoming.fromUserId, reason);
      setIncoming(null);
    },
    [incoming, socket]
  );

  const toggleMic = useCallback(() => {
    if (!active) return;
    webRTC.toggleMic();
    const newEnabled = !webRTC.local.micEnabled;
    if (active.target.kind === "group") {
      socket.callToggle({
        callId: active.callId,
        kind: "mic",
        enabled: newEnabled,
        conversationId: active.target.conversationId,
      });
    } else if (active.partner) {
      socket.callToggle({
        callId: active.callId,
        kind: "mic",
        enabled: newEnabled,
        to: active.partner._id,
      });
    }
  }, [active, webRTC, socket]);

  const toggleCam = useCallback(() => {
    if (!active) return;
    webRTC.toggleCam();
    const newEnabled = !webRTC.local.camEnabled;
    if (active.target.kind === "group") {
      socket.callToggle({
        callId: active.callId,
        kind: "cam",
        enabled: newEnabled,
        conversationId: active.target.conversationId,
      });
    } else if (active.partner) {
      socket.callToggle({
        callId: active.callId,
        kind: "cam",
        enabled: newEnabled,
        to: active.partner._id,
      });
    }
  }, [active, webRTC, socket]);

  const hangup = useCallback(() => {
    if (!active) return;
    if (active.direction === "out" && active.status === "ringing-out") {
      /* Cancel before connection */
      const recipients = active.recipients || [];
      if (recipients.length) {
        socket.callCancel(active.callId, recipients);
      }
      setActive((prev) => (prev ? { ...prev, status: "ended" } : prev));
      setCallEndedFlag((c) => c + 1);
      webRTC.stopAll();
      setTimeout(() => setActive(null), 1500);
      return;
    }
    /* Connected or connecting -> hangup */
    socket.callHangup({
      callId: active.callId,
      ...(active.target.kind === "group"
        ? { conversationId: active.target.conversationId }
        : { to: active.partner?._id }),
    });
    setActive((prev) => (prev ? { ...prev, status: "ended" } : prev));
    setCallEndedFlag((c) => c + 1);
    webRTC.stopAll();
    setTimeout(() => setActive(null), 1500);
  }, [active, socket, webRTC]);

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
    [active, incoming, startCall, acceptIncoming, rejectIncoming, toggleMic, toggleCam, hangup, webRTC.local, webRTC.remotes]
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
