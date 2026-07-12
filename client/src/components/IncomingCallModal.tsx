import { useCall } from "../hooks/useCall";
import Avatar from "./Avatar";
import { Phone, Video, PhoneOff } from "lucide-react";

const IncomingCallModal = () => {
  const { incoming, acceptIncoming, rejectIncoming } = useCall();
  if (!incoming) return null;

  const isVideo = incoming.type === "video";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-md animate-[fade-in_0.2s_ease-out]">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl p-6 text-center shadow-2xl animate-[scale-in_0.18s_ease-out]">
        <div className="mx-auto h-24 w-24 grid place-items-center rounded-full ring-1 ring-white/10 overflow-hidden mb-4"
             style={{ background: "linear-gradient(135deg,#5865F2,#a855f7)" }}>
          {incoming.caller.avatar ? (
            <img src={incoming.caller.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <Avatar name={incoming.caller.name} size="xl" />
          )}
        </div>
        <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">
          Incoming {isVideo ? "video" : "voice"} call
        </p>
        <h3 className="text-xl font-semibold text-white">{incoming.caller.name}</h3>
        {incoming.conversationId && (
          <p className="text-xs text-white/40 mt-1">Group call</p>
        )}

        <div className="mt-8 flex justify-center gap-5">
          <button
            onClick={() => rejectIncoming()}
            className="h-14 w-14 grid place-items-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-95 transition"
            title="Decline"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={() => acceptIncoming()}
            className="h-16 w-16 grid place-items-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 active:scale-95 transition animate-pulse"
            title="Accept"
          >
            {isVideo ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
