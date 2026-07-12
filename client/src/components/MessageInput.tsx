import { useRef, useCallback, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { useAuth } from "../context/AuthContext";
import { uploadFile } from "../api/message";
import type { SendMessagePayload } from "../types";
import { Smile, Paperclip, Mic, Send, X } from "lucide-react";

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
      <div className="p-3 md:p-4 flex items-center gap-2 bg-white/[0.02] backdrop-blur-xl border-t border-white/10">
        <button
          onClick={cancelRecording}
          className="h-10 w-10 grid place-items-center rounded-xl text-red-300 hover:bg-red-500/10 transition"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center gap-3 h-11 px-4 rounded-2xl bg-white/[0.04] border border-white/10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-200/90 font-mono text-sm">
            {formatRecordingTime(recordingTime)}
          </span>
          <div className="flex-1 flex items-center gap-1 justify-center">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-white/60 rounded-full animate-pulse"
                style={{
                  height: `${6 + Math.random() * 18}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={stopRecording}
          className="h-11 w-11 grid place-items-center rounded-2xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 transition"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 flex items-end gap-2 bg-gradient-to-t from-white/[0.04] to-white/[0.01] backdrop-blur-xl border-t border-white/[0.08] relative">
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute bottom-full left-3 mb-2 z-20 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,.doc,.docx,.zip,.rar,.txt"
      />

      <div className="flex-1 flex items-center gap-1 pl-2 pr-1.5 py-1.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus-within:border-indigo-400/40 focus-within:bg-white/[0.07] focus-within:shadow-[0_0_0_3px_rgba(88,101,242,0.14)] transition">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled || uploading}
          className="h-9 w-9 grid place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-30"
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="h-9 w-9 grid place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-30"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-white/35 outline-none"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? "Uploading…" : "Message"}
          disabled={disabled || uploading}
        />
      </div>

      {value.trim() ? (
        <button
          onClick={onSend}
          disabled={disabled || uploading}
          className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled || uploading}
          className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-white/[0.05] border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30"
          title="Record voice message"
        >
          <Mic className="h-4 w-4" />
        </button>
      )}

      {uploading && (
        <div className="absolute inset-x-0 bottom-full flex justify-center pb-2 pointer-events-none">
          <div className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#5865F2] animate-pulse" />
            <span className="text-xs text-white/70">Uploading…</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;