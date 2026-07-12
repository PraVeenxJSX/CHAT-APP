import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { useSocket } from "../context/SocketContext";
import MessageBubble from "./MessageBubble";
import ImageLightbox from "./ImageLightbox";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  typingUser: string | null;
  selectedUserName: string;
  loading?: boolean;
  onMessagesUpdate?: (updater: (msgs: Message[]) => Message[]) => void;
}

const MessageList = ({
  messages,
  currentUserId,
  typingUser,
  selectedUserName,
  loading,
  onMessagesUpdate,
}: MessageListProps) => {
  const { addReaction, addReactionListener } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    // On first render (or when switching chats), jump instantly to the bottom.
    // On subsequent message updates, scroll smoothly.
    const behavior = hasScrolledRef.current ? "smooth" : "auto";
    messagesEndRef.current.scrollIntoView({ behavior });
    hasScrolledRef.current = true;
  }, [messages, typingUser]);

  // Reset the flag when the conversation changes (messages array identity changes on chat switch)
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [selectedUserName]);

  // Listen for reaction updates and patch local messages
  useEffect(() => {
    const unsub = addReactionListener((data) => {
      onMessagesUpdate?.((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });
    return unsub;
  }, [addReactionListener, onMessagesUpdate]);

  const handleReact = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:0ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:150ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899] animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-white/50 text-sm">Loading messages…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 relative flex flex-col"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(88,101,242,0.06), transparent 40%), radial-gradient(circle at 85% 85%, rgba(168,85,247,0.05), transparent 45%)",
        }}
      >
        {/* Spacer pushes messages to the bottom when few */}
        <div className="flex-1" />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[50%] text-center">
            <div className="grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-white/90 font-semibold tracking-tight">Say hello</p>
            <p className="text-sm mt-1 text-white/45 max-w-[22ch]">
              Send your first message to start the conversation.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showDay =
              !prev ||
              new Date(prev.createdAt).toDateString() !==
                new Date(msg.createdAt).toDateString();
            return (
              <div key={msg._id}>
                {showDay && (
                  <div className="flex items-center gap-3 my-4 select-none">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/40 font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                      {dayLabel(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={msg.sender._id === currentUserId}
                  onReact={handleReact}
                  onImageClick={(src) => setLightboxSrc(src)}
                />
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 pl-1 pt-1">
            <div className="flex gap-1 items-end px-3 py-2 rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-white/40">
              {selectedUserName} is typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
};

export default MessageList;
