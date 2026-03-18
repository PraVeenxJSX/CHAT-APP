import { useState } from "react";
import type { Message, Reaction } from "../types";
import AudioPlayer from "./AudioPlayer";

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
}: {
  msg: Message;
  onImageClick: (src: string) => void;
}) => {
  switch (msg.type) {
    case "image":
      return (
        <img
          src={`${API_BASE}${msg.fileUrl}`}
          alt="shared image"
          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyber-bg/50 border border-cyber-border hover:border-cyber-cyan/40 transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-cyber-purple flex-shrink-0">
            <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-cyber-text truncate group-hover:text-cyber-cyan transition-colors">
              {msg.content || "File"}
            </p>
            <p className="text-[10px] text-cyber-text-dim">{msg.fileType || "Download"}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-cyber-text-dim group-hover:text-cyber-cyan transition-colors flex-shrink-0">
            <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
        </a>
      );

    case "text":
    default:
      return <p className="break-words text-cyber-text">{msg.content}</p>;
  }
};

const MessageBubble = ({ message, isOwn, onReact, onImageClick }: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const grouped = groupReactions(message.reactions);

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-[message-in_0.3s_ease-out] group`}
    >
      <div className="relative max-w-[85%] md:max-w-[60%]">
        {/* Quick reaction bar on hover */}
        <div
          className={`absolute -top-8 ${isOwn ? "right-0" : "left-0"} opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}
        >
          <div className="flex items-center gap-0.5 bg-cyber-surface/95 backdrop-blur-sm border border-cyber-border rounded-full px-1.5 py-0.5 shadow-lg">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className="hover:scale-125 active:scale-95 transition-transform px-1 py-0.5 text-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Message bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl border transition-all ${
            isOwn
              ? "bg-cyber-cyan/10 border-cyber-cyan/30 rounded-br-sm"
              : "bg-cyber-surface-light border-cyber-border rounded-bl-sm"
          }`}
          onDoubleClick={() => setShowReactions(!showReactions)}
        >
          <MessageContent msg={message} onImageClick={onImageClick} />

          <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-cyber-text-dim">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isOwn && (
              <span
                className={`text-[10px] ${
                  message.status === "read" || message.status === ("seen" as string)
                    ? "text-cyber-cyan neon-text-cyan"
                    : "text-cyber-text-dim"
                }`}
              >
                {message.status === "sent" ? "\u2713" : "\u2713\u2713"}
              </span>
            )}
          </div>
        </div>

        {/* Reaction badges */}
        {grouped.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            {grouped.map(({ emoji, count }) => (
              <button
                key={emoji}
                onClick={() => onReact(message._id, emoji)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyber-surface-light/80 border border-cyber-border hover:border-cyber-cyan/40 text-xs transition-all hover:shadow-neon-cyan"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-cyber-text-dim">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
