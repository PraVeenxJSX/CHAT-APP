import { useState, useEffect, useCallback } from "react";
import { searchMessages } from "../api/message";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";
import Avatar from "./Avatar";
import { Search, X } from "lucide-react";

interface SearchPanelProps {
  onClose: () => void;
  onMessageClick?: (message: Message) => void;
}

const SearchPanel = ({ onClose, onMessageClick }: SearchPanelProps) => {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !token) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchMessages(q, token);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const debounce = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounce);
  }, [query, doSearch]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-[#5865F2]/30 text-white rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-20 max-w-xl mx-auto rounded-2xl z-50 shadow-2xl overflow-hidden bg-[#12141b]/95 backdrop-blur-2xl border border-white/10">
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <Search className="h-4 w-4 text-white/50 ml-2" />
          <input
            type="text"
            placeholder="Search messages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent px-2 py-2 text-white placeholder-white/35 outline-none"
          />
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-white/50 text-sm">
              <div className="flex justify-center gap-1 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:100ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2] animate-bounce [animation-delay:200ms]" />
              </div>
              Searching…
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-white/45 text-sm">
              No messages found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-white/5">
              {results.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => onMessageClick?.(msg)}
                  className="w-full px-4 py-3 text-left hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={msg.sender.name} avatar={msg.sender.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-medium text-white truncate">
                          {msg.sender.name}
                        </span>
                        <span className="text-[10px] text-white/40 shrink-0">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 line-clamp-2">
                        {msg.content ? highlightMatch(msg.content, query) : "[Media]"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-10 text-center text-white/45">
              <div className="mx-auto grid place-items-center h-12 w-12 rounded-2xl bg-white/[0.05] border border-white/10 mb-3">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm">Type to search across all messages</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchPanel;