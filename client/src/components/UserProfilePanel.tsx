import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Avatar from "./Avatar";

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
      if (selectedFileRef.current) {
        formData.append("avatar", selectedFileRef.current);
      }

      const res = await api.put("/api/users/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Re-login to update user in context (simplified approach)
      // In a real app, you might update the context directly
      console.log("Profile updated:", res.data);
      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-cyber-surface border-l border-cyber-border z-50 animate-[slide-in-right_0.3s_ease-out]">
        <div className="p-4 border-b border-cyber-border flex items-center justify-between">
          <h2 className="text-lg font-cyber text-cyber-cyan">PROFILE</h2>
          <button
            onClick={onClose}
            className="p-2 text-cyber-text-dim hover:text-cyber-magenta transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Avatar */}
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
                  className="h-20 w-20 rounded-full object-cover border-2 border-cyber-cyan/40"
                />
              ) : (
                <Avatar name={user?.name || "U"} size="lg" />
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyber-cyan">
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
            <p className="text-xs text-cyber-text-dim">Click to change avatar</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-cyber-text-dim mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-4 py-2 text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan transition-colors"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm text-cyber-text-dim mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="w-full bg-cyber-bg/50 border border-cyber-border rounded-lg px-4 py-2 text-cyber-text-dim cursor-not-allowed"
            />
          </div>

          {/* Status message */}
          <div>
            <label className="block text-sm text-cyber-text-dim mb-1">Status</label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-4 py-2 text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan transition-colors"
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg font-bold disabled:opacity-40 hover:shadow-neon-cyan transition-all"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
};

export default UserProfilePanel;
