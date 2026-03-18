import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { useSocket } from "../context/SocketContext";
import MessageBubble from "./MessageBubble";
import ImageLightbox from "./ImageLightbox";

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

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
            <span className="h-3 w-3 rounded-full bg-cyber-cyan animate-bounce [animation-delay:0ms]" />
            <span className="h-3 w-3 rounded-full bg-cyber-purple animate-bounce [animation-delay:150ms]" />
            <span className="h-3 w-3 rounded-full bg-cyber-magenta animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-cyber-text-dim text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-cyber-text-dim">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender._id === currentUserId}
            onReact={handleReact}
            onImageClick={(src) => setLightboxSrc(src)}
          />
        ))}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 px-2">
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyber-cyan animate-[neon-pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-cyber-purple animate-[neon-pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "200ms" }} />
              <span className="h-2 w-2 rounded-full bg-cyber-magenta animate-[neon-pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "400ms" }} />
            </div>
            <span className="text-sm text-cyber-text-dim">
              {selectedUserName} is typing...
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
