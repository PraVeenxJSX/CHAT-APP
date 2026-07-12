import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Avatar from "./Avatar";
import { X, Camera, Loader2 } from "lucide-react";

interface UserProfilePanelProps {
  onClose: () => void;
}

const UserProfilePanel = ({ onClose }: UserProfilePanelProps) => {
  const { user, token } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [statusMessage, setStatusMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedFileRef.current = file;
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (name.trim()) formData.append("name", name.trim());
      formData.append("statusMessage", statusMessage);
      if (selectedFileRef.current) formData.append("avatar", selectedFileRef.current);
      await api.put("/api/users/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-[#12141b]/95 backdrop-blur-2xl border-l border-white/10 animate-[slide-in-right_0.3s_ease-out] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#12141b]/95 backdrop-blur-xl z-10">
          <h2 className="text-base font-semibold text-white">Your profile</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <Avatar name={user?.name || "U"} size="xl" />
              )}
              <div className="absolute inset-0 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <p className="text-xs text-white/45">Click to change avatar</p>
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white/50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-white/60 mb-1.5 block">Status</label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] text-white font-medium text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default UserProfilePanel;