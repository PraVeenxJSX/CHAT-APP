import { useRef, useCallback, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../api/message";
import type { SendMessagePayload } from "../types";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendMedia: (payload: Omit<SendMessagePayload, "receiver">) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

const MessageInput = ({
  value,
  onChange,
  onSend,
  onSendMedia,
  onTyping,
  onStopTyping,
  disabled,
}: MessageInputProps) => {
  const { token } = useAuth();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      onTyping();

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
      }, 800);
    },
    [onChange, onTyping, onStopTyping]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    try {
      const { fileUrl, fileType } = await uploadFile(file, token);
      const isImage = fileType.startsWith("image/");
      onSendMedia({
        type: isImage ? "image" : "file",
        fileUrl,
        fileType,
        content: file.name,
      });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        if (!token) return;
        setUploading(true);
        try {
          const { fileUrl, fileType } = await uploadFile(file, token);
          onSendMedia({ type: "audio", fileUrl, fileType });
        } catch (err) {
          console.error("Voice upload failed:", err);
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    audioChunksRef.current = [];
    setRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(value + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  if (recording) {
    return (
      <div className="p-4 flex items-center gap-3 bg-cyber-surface border-t border-cyber-border">
        <button
          onClick={cancelRecording}
          className="p-2 text-cyber-magenta hover:bg-cyber-magenta/10 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-cyber-magenta animate-pulse shadow-neon-magenta" />
          <span className="text-cyber-magenta font-mono text-sm">
            {formatRecordingTime(recordingTime)}
          </span>
          <div className="flex-1 flex items-center gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-cyber-magenta/60 rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 16}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={stopRecording}
          className="bg-gradient-to-r from-cyber-cyan to-cyber-blue px-5 py-3 rounded-xl text-cyber-bg font-bold hover:shadow-neon-cyan active:scale-95 transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-2 bg-cyber-surface border-t border-cyber-border relative">
      {/* Emoji picker popover */}
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 z-20">
            <EmojiPicker
              theme={Theme.DARK}
              onEmojiClick={handleEmojiClick}
              width={320}
              height={400}
              searchPlaceholder="Search emoji..."
              lazyLoadEmojis
            />
          </div>
        </>
      )}

      {/* Emoji button */}
      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        disabled={disabled || uploading}
        className="p-3 text-cyber-text-dim hover:text-cyber-purple hover:bg-cyber-purple/10 rounded-xl transition-all duration-300 disabled:opacity-30"
        title="Emoji"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* File attachment */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,.doc,.docx,.zip,.rar,.txt"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="p-3 text-cyber-text-dim hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-xl transition-all duration-300 disabled:opacity-30"
        title="Attach file"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 01-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007a2.25 2.25 0 01-3.182-3.182l.006-.006.007-.007 7.694-7.694a.75.75 0 011.06 1.06L7.974 16.7a.75.75 0 101.06 1.06l8.933-8.933a2.25 2.25 0 000-3.168z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Text input */}
      <input
        className="flex-1 bg-cyber-bg border border-cyber-border rounded-xl px-4 py-3 text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan focus:shadow-neon-cyan transition-all duration-300"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={uploading ? "Uploading..." : "Type a message..."}
        disabled={disabled || uploading}
      />

      {/* Voice record or Send */}
      {value.trim() ? (
        <button
          onClick={onSend}
          disabled={disabled || uploading}
          className="bg-gradient-to-r from-cyber-cyan to-cyber-blue px-5 py-3 rounded-xl text-cyber-bg font-bold hover:shadow-neon-cyan active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled || uploading}
          className="p-3 text-cyber-text-dim hover:text-cyber-magenta hover:bg-cyber-magenta/10 rounded-xl transition-all duration-300 disabled:opacity-30"
          title="Record voice message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
          </svg>
        </button>
      )}

      {/* Upload progress overlay */}
      {uploading && (
        <div className="absolute inset-x-0 bottom-full flex justify-center pb-2">
          <div className="bg-cyber-surface border border-cyber-border rounded-lg px-4 py-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyber-cyan animate-pulse" />
            <span className="text-sm text-cyber-text-dim">Uploading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
