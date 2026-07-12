import { useState } from "react";
import type { Message, Reaction } from "../types";
import AudioPlayer from "./AudioPlayer";
import { Download, FileText, Check, CheckCheck, SmilePlus } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReact: (messageId: string, emoji: string) => void;
  onImageClick: (src: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const QUICK_REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F525}", "\u{1F622}", "\u{1F60E}"];

const groupReactions = (reactions?: Reaction[]) => {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, string[]>();
  for (const r of reactions) {
    const arr = map.get(r.emoji) || [];
    arr.push(r.userId);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
};

const MessageContent = ({
  msg,
  onImageClick,
  isOwn,
}: {
  msg: Message;
  onImageClick: (src: string) => void;
  isOwn: boolean;
}) => {
  switch (msg.type) {
    case "image":
      return (
        <img
          src={`${API_BASE}${msg.fileUrl}`}
          alt="shared image"
          className="max-w-full max-h-72 rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(`${API_BASE}${msg.fileUrl}`)}
          loading="lazy"
        />
      );

    case "audio":
      return <AudioPlayer src={`${API_BASE}${msg.fileUrl}`} />;

    case "file":
      return (
        <a
          href={`${API_BASE}${msg.fileUrl}`}
          download
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group ${
            isOwn
              ? "bg-white/10 border-white/15 hover:bg-white/15"
              : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
          }`}
        >
          <div className="h-9 w-9 rounded-lg grid place-items-center bg-white/10 shrink-0">
            <FileText className="h-4 w-4 text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{msg.content || "File"}</p>
            <p className="text-[11px] text-white/50">{msg.fileType || "Download"}</p>
          </div>
          <Download className="h-4 w-4 text-white/50 group-hover:text-white transition-colors shrink-0" />
        </a>
      );

    case "text":
    default:
      return <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
  }
};

const MessageBubble = ({ message, isOwn, onReact, onImageClick }: MessageBubbleProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const grouped = groupReactions(message.reactions);

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-[message-in_0.3s_ease-out] group`}
    >
      <div className="relative max-w-[85%] md:max-w-[60%]">
        {/* Quick reaction bar on hover */}
        <div
          className={`absolute -top-9 ${
            isOwn ? "right-0" : "left-0"
          } opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-10`}
        >
          <div className="flex items-center gap-0.5 bg-[#161821]/95 backdrop-blur-xl border border-white/10 rounded-full px-1.5 py-1 shadow-lg shadow-black/40">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className="hover:scale-125 active:scale-95 transition-transform px-1 py-0.5 text-sm"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="ml-0.5 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/[0.08] transition"
              title="More"
            >
              <SmilePlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Message bubble */}
        <div
          onDoubleClick={() => setPickerOpen((v) => !v)}
          className={`px-4 py-2.5 text-[13.5px] shadow-sm transition-all ${
            isOwn
              ? "text-white rounded-2xl rounded-br-md"
              : "text-white/95 rounded-2xl rounded-bl-md bg-white/[0.055] border border-white/[0.09] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          }`}
          style={
            isOwn
              ? {
                  background:
                    "linear-gradient(135deg, #6b78ff 0%, #5865F2 45%, #7c3aed 100%)",
                  boxShadow:
                    "0 8px 24px -10px rgba(88,101,242,0.6), inset 0 1px 0 rgba(255,255,255,0.18)",
                }
              : undefined
          }
        >
          <MessageContent msg={message} onImageClick={onImageClick} isOwn={isOwn} />

          <div
            className={`flex items-center gap-1 mt-1 ${
              isOwn ? "justify-end text-white/70" : "justify-start text-white/40"
            }`}
          >
            <span className="text-[10px]">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isOwn && (
              <span className="ml-0.5">
                {message.status === "read" || message.status === ("seen" as string) ? (
                  <CheckCheck className="h-3 w-3 text-sky-200" />
                ) : message.status === "delivered" ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction badges */}
        {grouped.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            {grouped.map(({ emoji, count }) => (
              <button
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] text-xs text-white/80 transition"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-white/50">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {pickerOpen && (
          <div
            className={`absolute ${isOwn ? "right-0" : "left-0"} mt-1 z-10 flex gap-1 bg-[#161821]/95 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1 shadow-lg`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message._id, emoji);
                  setPickerOpen(false);
                }}
                className="hover:scale-125 transition-transform text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
