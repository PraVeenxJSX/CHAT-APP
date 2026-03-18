import { useState, useEffect, useCallback } from "react";
import { searchMessages } from "../api/message";
import { useAuth } from "../context/AuthContext";
import type { Message } from "../types";
import Avatar from "./Avatar";

interface SearchPanelProps {
  onClose: () => void;
  onMessageClick?: (message: Message) => void;
}

const SearchPanel = ({ onClose, onMessageClick }: SearchPanelProps) => {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
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
  }, [token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      doSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, doSearch]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-cyber-cyan/30 text-cyber-cyan">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-20 max-w-xl mx-auto bg-cyber-surface border border-cyber-border rounded-2xl z-50 shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b border-cyber-border flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-cyber-cyan flex-shrink-0">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-cyber-text placeholder-cyber-text-dim outline-none"
          />
          <button
            onClick={onClose}
            className="p-2 text-cyber-text-dim hover:text-cyber-magenta transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-cyber-text-dim">
              <div className="flex justify-center gap-1 mb-2">
                <span className="h-2 w-2 rounded-full bg-cyber-cyan animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-cyber-cyan animate-bounce [animation-delay:100ms]" />
                <span className="h-2 w-2 rounded-full bg-cyber-cyan animate-bounce [animation-delay:200ms]" />
              </div>
              Searching...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-cyber-text-dim">
              <p>No messages found</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-cyber-border">
              {results.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => onMessageClick?.(msg)}
                  className="w-full p-4 text-left hover:bg-cyber-surface-light transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={msg.sender.name}
                      avatar={msg.sender.avatar}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-cyber-text truncate">
                          {msg.sender.name}
                        </span>
                        <span className="text-[10px] text-cyber-text-dim flex-shrink-0">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-cyber-text-dim line-clamp-2">
                        {msg.content ? highlightMatch(msg.content, query) : "[Media]"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-8 text-center text-cyber-text-dim">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-30">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
              </svg>
              <p>Type to search messages</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchPanel;
