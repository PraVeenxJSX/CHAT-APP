import { useState, useEffect } from "react";
import { fetchReplySuggestions } from "../api/message";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";
import { Sparkles } from "lucide-react";

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
        if (Array.isArray(data)) setSuggestions(data.slice(0, 4));
      })
      .catch((err) => console.error("AI suggestions error:", err))
      .finally(() => setLoading(false));

    const timeout = setTimeout(() => setSuggestions([]), 30000);
    return () => clearTimeout(timeout);
  }, [lastReceivedMessage, token, lastMessageId]);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-2 flex items-center gap-2 border-t border-white/10 bg-white/[0.02]">
        <Sparkles className="h-3.5 w-3.5 text-purple-300" />
        <span className="text-xs text-white/60">AI is thinking</span>
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:100ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:200ms]" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 md:px-6 py-2.5 border-t border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-1.5 mb-2 text-purple-300/90">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium tracking-wide uppercase">Smart replies</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => {
              onSelectSuggestion(suggestion);
              setSuggestions([]);
            }}
            className="px-3 py-1.5 text-sm rounded-full bg-white/[0.05] border border-white/10 text-white/85 hover:bg-white/[0.1] hover:border-white/20 transition"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AISuggestions;