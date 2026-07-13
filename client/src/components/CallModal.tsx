import { useEffect, useRef, useState } from "react";
import { useCall } from "../hooks/useCall";
import Avatar from "./Avatar";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const CallModal = () => {
  const { active, media, toggleMic, toggleCam, hangup } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement | null>>(new Map());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (active.startedAt) {
        setElapsed(Math.floor((Date.now() - active.startedAt) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (localVideoRef.current && media.local.stream) {
      localVideoRef.current.srcObject = media.local.stream;
    }
  }, [media.local.stream]);

  useEffect(() => {
    media.remotes.forEach((r) => {
      const vEl = remoteRefs.current.get(r.userId);
      if (vEl && vEl.srcObject !== r.stream) {
        vEl.srcObject = r.stream;
      }
      // Ensure audio tracks play
      const aEl = remoteAudioRefs.current.get(r.userId);
      if (aEl && aEl.srcObject !== r.stream) {
        aEl.srcObject = r.stream;
        aEl.play().catch(() => {});
      }
    });
  }, [media.remotes]);

  if (!active) return null;

  const isVideo = active.type === "video";
  const isOutgoing = active.direction === "out";
  const isEnded = active.status === "ended";
  const recipientCount = active.recipients?.length ?? media.remotes.length;
  const callerName =
    active.partner?.name ||
    active.caller?.name ||
    active.groupName ||
    "Call";

  const callerAvatar = (() => {
    const raw = active.partner?.avatar || active.caller?.avatar;
    if (!raw) return null;
    return raw.startsWith("http") ? raw : `${API_BASE}${raw}`;
  })();

  /* Sub-modal when minimized */
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed z-[99] bottom-4 right-4 flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 shadow-lg shadow-emerald-500/30 transition active:scale-95"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <span className="text-sm font-medium">{callerName}</span>
        <span className="text-xs opacity-90">{formatDuration(elapsed)}</span>
        <Maximize2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[98] bg-black/80 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] uppercase tracking-widest text-white/40">
            {isOutgoing ? "Calling" : "In call"}
          </span>
          {active.target.kind === "group" && active.recipients && (
            <span className="text-[11px] text-white/40">
              {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          onClick={() => setMinimized(true)}
          className="h-8 w-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition"
          title="Minimize"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Main stage */}
      <div className="flex-1 relative flex">
        {/* Remote tiles */}
        <div className="flex-1 grid place-items-center p-4 md:p-8 relative overflow-hidden">
          {media.remotes.length === 0 ? (
            <RingingPlaceholder
              name={callerName}
              avatarUrl={callerAvatar}
              status={isEnded ? "ended" : isOutgoing ? "ringing" : "connecting"}
              callType={active.type}
            />
          ) : (
            <div
              className={`grid gap-2 md:gap-3 w-full max-w-5xl ${
                media.remotes.length === 1
                  ? "grid-cols-1"
                  : media.remotes.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3"
              }`}
            >
              {media.remotes.map((r) => (
                <RemoteTile
                  key={r.userId}
                  name={r.name}
                  hasVideo={r.hasVideo && r.camEnabled}
                  micEnabled={r.micEnabled}
                  videoRef={(el) => {
                    remoteRefs.current.set(r.userId, el);
                  }}
                  audioRef={(el) => {
                    remoteAudioRefs.current.set(r.userId, el);
                  }}
                />
              ))}
            </div>
          )}

          {/* Local video (PiP) */}
          {isVideo && media.local.stream && (
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 h-20 w-28 sm:h-28 sm:w-40 md:h-36 md:w-52 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/60">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!media.local.camEnabled && <div className="absolute inset-0 bg-black grid place-items-center text-white/60 text-xs">Camera off</div>}
              <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 backdrop-blur rounded px-1.5 py-0.5 text-white/80">
                You
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / controls */}
      <div className="px-3 sm:px-6 py-4 sm:py-6 border-t border-white/10 bg-black/40 backdrop-blur flex flex-col items-center gap-3 sm:gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="text-center px-2 max-w-full">
          <div className="text-base sm:text-lg font-semibold text-white truncate max-w-[90vw]">
            {isEnded ? "Call ended" : callerName}
          </div>
          <div className="text-xs text-white/50">
            {isEnded
              ? formatDuration(elapsed)
              : isOutgoing && media.remotes.length === 0
              ? "Ringing…"
              : formatDuration(elapsed)}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ControlButton
            active={!media.local.micEnabled}
            onClick={toggleMic}
            icon={media.local.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            dangerWhenOff
            label={media.local.micEnabled ? "Mute" : "Unmute"}
          />
          {isVideo && (
            <ControlButton
              active={!media.local.camEnabled}
              onClick={toggleCam}
              icon={media.local.camEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              dangerWhenOff
              label={media.local.camEnabled ? "Camera" : "Camera off"}
            />
          )}
          <ControlButton
            onClick={hangup}
            icon={<PhoneOff className="h-6 w-6" />}
            variant="hangup"
            label="End call"
          />
        </div>
      </div>
    </div>
  );
};

const RingingPlaceholder = ({
  name,
  avatarUrl,
  status,
}: {
  name: string;
  avatarUrl: string | null;
  status: "ringing" | "connecting" | "ended";
  callType: "audio" | "video";
}) => {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className="h-32 w-32 md:h-40 md:w-40 rounded-full grid place-items-center ring-1 ring-white/10 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#5865F2,#a855f7)" }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Avatar name={name || "?"} size="xl" />
        )}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white">{name}</h2>
        <p className="text-sm text-white/50 mt-1">
          {status === "ringing" && "Ringing…"}
          {status === "connecting" && "Connecting…"}
          {status === "ended" && "Call ended"}
        </p>
      </div>
      {status !== "ended" && (
        <div className="flex gap-1.5 mt-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
};

const RemoteTile = ({
  name,
  hasVideo,
  micEnabled,
  videoRef,
  audioRef,
}: {
  name: string;
  hasVideo: boolean;
  micEnabled: boolean;
  videoRef: (el: HTMLVideoElement | null) => void;
  audioRef: (el: HTMLAudioElement | null) => void;
}) => {
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1d1f29] to-[#0c0d12]">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="h-20 w-20 md:h-28 md:w-28 rounded-full grid place-items-center ring-1 ring-white/10"
            style={{ background: "linear-gradient(135deg,#5865F2,#a855f7)" }}
          >
            <Avatar name={name || "?"} size="lg" />
          </div>
        </div>
      )}
      {/* Audio element for remote audio (always needed for both audio/video calls) */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur text-xs text-white/90 flex items-center gap-1.5">
        {micEnabled ? (
          <Mic className="h-3 w-3 text-emerald-400" />
        ) : (
          <MicOff className="h-3 w-3 text-red-300" />
        )}
        <span className="truncate max-w-[120px]">{name}</span>
      </div>
    </div>
  );
};

const ControlButton = ({
  onClick,
  icon,
  active,
  variant,
  dangerWhenOff,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
  variant?: "hangup";
  dangerWhenOff?: boolean;
  label: string;
}) => {
  let bg = "bg-white/10 hover:bg-white/15 text-white";
  if (variant === "hangup") bg = "bg-red-500 hover:bg-red-600 text-white";
  else if (dangerWhenOff && active) bg = "bg-white/85 text-black hover:bg-white";

  return (
    <button
      onClick={onClick}
      className={`h-12 w-12 md:h-14 md:w-14 grid place-items-center rounded-full transition active:scale-95 shadow-lg ${bg}`}
      title={label}
    >
      {icon}
    </button>
  );
};

export default CallModal;
