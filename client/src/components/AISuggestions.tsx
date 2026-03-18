import { useState, useEffect } from "react";
import { fetchReplySuggestions } from "../api/message";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";

interface AISuggestionsProps {
  lastReceivedMessage: Message | null;
  onSelectSuggestion: (text: string) => void;
}

const AISuggestions = ({ lastReceivedMessage, onSelectSuggestion }: AISuggestionsProps) => {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !lastReceivedMessage ||
      !token ||
      lastReceivedMessage._id === lastMessageId ||
      lastReceivedMessage.type !== "text" ||
      !lastReceivedMessage.content
    ) {
      return;
    }

    setLastMessageId(lastReceivedMessage._id);
    setLoading(true);
    setSuggestions([]);

    fetchReplySuggestions(lastReceivedMessage.content, token)
      .then((data) => {
        if (Array.isArray(data)) {
          setSuggestions(data.slice(0, 4));
        }
      })
      .catch((err) => {
        console.error("AI suggestions error:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Auto-hide suggestions after 30s
    const timeout = setTimeout(() => {
      setSuggestions([]);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [lastReceivedMessage, token, lastMessageId]);

  if (loading) {
    return (
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="text-xs text-cyber-purple">AI thinking</span>
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyber-purple animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyber-purple animate-bounce [animation-delay:100ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyber-purple animate-bounce [animation-delay:200ms]" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-cyber-border bg-cyber-surface/50">
      <div className="flex items-center gap-2 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-cyber-purple">
          <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
        </svg>
        <span className="text-xs text-cyber-purple font-cyber">AI SUGGESTIONS</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSelectSuggestion(suggestion);
              setSuggestions([]);
            }}
            className="px-3 py-1.5 text-sm rounded-full bg-cyber-purple/10 border border-cyber-purple/40 text-cyber-purple hover:border-cyber-purple hover:shadow-neon-purple transition-all duration-300"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;
